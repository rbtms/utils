#
# Small IMAP mail client
#

import sys
import imaplib
import email

HOST = "HOST"
PORT = 0
USER = "USER"
PWD  = "PWD"

sys.stdin.reconfigure(encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8')

def parseMail(mail):
    subject  = [ line for line in mail.split("\r\n") if "Subject: " in line ][0][9:]
    fromMail = [ line for line in mail.split("\r\n") if "From: " in line ][0][6:]
    date     = [ line for line in mail.split("\r\n") if "Date: " in line ][0][6:]

    msg = email.message_from_string(mail)

    if type(msg.get_payload()) == list:
        payload = str(msg.get_payload()[0]).strip()
    else:
        payload = msg.get_payload().strip()

    return { "subject": subject, "from": fromMail, "date": date, "payload": payload }

def readInbox(imap):
    mails = []
    
    resMails = imap.search(None, "ALL")

    if resMails[0] == "OK":
        msgsN = resMails[1][0].decode("utf-8").split()

        for n in msgsN:
            resMail = imap.fetch(n, "(RFC822)")

            if resMail[0] == "OK":
                mails.append( resMail[1][0][1].decode("utf-8") )
            else:
                print("Couldnt fetch mail: " + n)

        for n in range(len(mails)):
            m = parseMail( mails[len(mails)-int(n)-1] )
            print(f'{[n+1]} {m["subject"]} ({m["from"]})')
            print(f'\n{m["payload"]}\n')
    else:
        print("Couldnt fetch mails.")

def deleteMail(imap, n):
    print(n)
    imap.store(n, "+FLAGS", "(\\Deleted)")

def deleteAll(imap):
    resMails = imap.search(None, "ALL")

    if resMails[0] == "OK":
        msgsN = resMails[1][0].decode("utf-8").split()

        for n in msgsN:
            deleteMail(imap, n)
    else:
        print("Couldnt fetch mails.")

def main():
    imap = imaplib.IMAP4_SSL(host=HOST, port=PORT)
    imap.login(USER, PWD)

    # Select INBOX
    res = imap.select("INBOX")

    if res[0] == "OK":
        # Delete emails
        if len(sys.argv) > 1 and sys.argv[1] == "delete":
            if len(sys.argv) == 2:
                deleteAll(imap)
            else:
                deleteMail(imap, sys.argv[2])
        # Fetch emails
        else:
            msgN = res[1][0].decode("utf-8")

            if msgN == "0":
                print("No messages.\n")
            else:
                print( msgN + " message" + ("s" if msgN != "1" else "") + ".\n" )
                readInbox(imap)

        imap.close()
        imap.logout()
    else:
        print("Couldnt connnect.")
    
main()
