import os
import sys
import pathlib
import json
from datetime import datetime
from proton.api import Session

# Read credentials data
credentials_file = 'credentials.json'
credentials_path = os.path.join(pathlib.Path(__file__).parent.resolve(), credentials_file)
credentials = json.loads(open(credentials_path, "r", encoding="utf8").read())

USERNAME = credentials["user"]
PASSWORD = credentials["pwd"]


__allow_alternative_routing__= True

class Protonmail:
    def __init__(self):
        self.session = None
        self.get_session()

    def get_session(self):
        self.session = Session(
            'https://api.protonmail.ch',
            TLSPinning=False
        )

        self.session.enable_alternative_routing = False
        self.session.authenticate(username=USERNAME, password=PASSWORD)

    def getMails(self):
        info_response = self.session.api_request("/mail/v4/conversations")
        mails = []

        for conversation in info_response["Conversations"]:
            email_id = conversation["ID"]
            email_content = self.session.api_request("/mail/v4/conversations/" + email_id)

            ID          = email_content["Conversation"]["ID"]
            subject     = email_content["Conversation"]["Subject"]
            sender_mail = email_content["Conversation"]["Senders"][0]["Address"] # Only the sender of the first email
            sender_name = email_content["Conversation"]["Senders"][0]["Name"] # Only the name of the sender of the first email
            epoch       = email_content["Conversation"]["Labels"][0]["ContextTime"] # Only the first label. Idk why there are multiple
            date        = datetime.fromtimestamp(epoch)

            mails.append({
                "ID"          : ID,
                "subject"     : subject,
                "sender_mail" : sender_mail,
                "sender_name" : sender_name,
                "date"        : str(date)
            })

        return mails

    def deleteMails(self):
        mails = self.getMails()
        ids = [ mail["ID"] for mail in mails ]

        # Supposing that LabelID 0 removes all the mails
        # and LabelID 3 removes them from the trash.
        # Apparently it works without moving the mails to the trash first
        # For some reason it returns an error always.

        try:
            # Move to trash first

            #session.api_request(
            #    "/mail/v4/conversations/label",
            #    method="put",
            #    jsondata={"IDs":ids, "LabelID": "3"}
            #)

            # Wait until it moves them (not sure if needed)
            #time.sleep(1)
            print("{} mails deleted.\n".format(len(mails)))

            self.session.api_request(
                "/mail/v4/conversations/delete",
                method="put",
                jsondata={"IDs": ids, "LabelID": "0"}
            )
        except:
            pass

    def printMails(self):
        mails = self.getMails()

        if not mails:
            print("No messages.")
        else:
            print("{} messages.\n".format(len(mails)))

            for mail in mails:
                print( "[{date}] {name} - {subject}".format(
                    date = mail["date"],
                    name = mail["sender_mail"] if mail['sender_name'] == '' else mail['sender_name'],
                    subject = mail["subject"]
                ))

        print()

def ask_for_confirmation(question):
    """Ask a prompt to the user"""
    response = input(f'{question} (y/n) ')

    if response in ('n', 'N'):
        return False
    elif response in ('y', 'Y'):
        return True
    else:
        return ask_for_confirmation(question)

def main():
    pm = Protonmail()

    if len(sys.argv) == 2:
        if sys.argv[1] == "delete":
            if ask_for_confirmation("Do you want to delete all mails?"):
                pm.deleteMails()
        else:
            print("Incorrect argument. [delete]")
    else:
        pm.printMails()

main()
