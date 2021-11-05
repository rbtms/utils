#
# Script to upload files and clipboard to catbox/litterbox
# Usage: catbox.py [litterbox] <file>
#        catbox.py [litterbox] (if you have an image on your clipboard)
#
# Requires: PIL, requests (pip), clip.exe (windows)
#

import os
import sys
import subprocess
import requests
from PIL import ImageGrab

API_URL_CATBOX    = "https://catbox.moe/user/api.php"
API_URL_LITTERBOX = "https://litterbox.catbox.moe/resources/internals/api.php"
TMP_FILE = "tmp.png" # Not in /tmp because of path issues

def saveClipboardTmp():
    im = ImageGrab.grabclipboard()
    im.save(TMP_FILE, "png")

def uploadUrl(url):
    return requests.post(url=API_URL_CATBOX, data={
        "reqtype": "urlupload",
        "url": url
    }).text

def uploadFile(url, path, data):
    return requests.post(
        url=url,
        files={ "fileToUpload": open(path, "rb") },
        data=data
    ).text

def uploadFileToSite(path, site):
    if site == "CATBOX":
        return uploadFile(API_URL_CATBOX, path,
            {"reqtype": "fileupload"}
        )
    else:
        return uploadFile(API_URL_LITTERBOX, path,
            {"reqtype": "fileupload", "time": "1h"}
        )

def main():
    path = None
    site = "CATBOX"
    uploadType = "FILE"

    # Remove the site so that the first argument is the path of the file
    if "litterbox" in sys.argv:
        site = "LITTERBOX"
        sys.argv.remove("litterbox")

    # Use argument path or create temporary file
    if len(sys.argv) > 1:
        path = sys.argv[1]

        if "http" in path:
            uploadType = "URL"

        print("Uploading " + path + ".")
    else:
        saveClipboardTmp()
        path = TMP_FILE
        print("Uploading clipboard.")

    # Bytes object
    url = uploadFileToSite(path, site) if uploadType == "FILE" else uploadUrl(path)

    # Copy to clipboard
    subprocess.run("clip.exe", input=bytes(url, "utf-8"))
    print("[" + url + "] pasted to clipboard.")

    # Remove temporary file
    if path == TMP_FILE:
        os.remove(TMP_FILE)

main()
