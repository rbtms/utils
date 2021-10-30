#
# Script to upload files and clipboard to catbox
# Usage: catbox <file>
#        catbox (if you have an image on your clipboard)
#
# Requires: PIL, pyupload (pip), clip.exe (windows)
#

import os
import sys
import subprocess
from PIL import ImageGrab

TMP_FILE = "tmp.png"

def saveClipboardTmp():
    im = ImageGrab.grabclipboard()
    im.save(TMP_FILE, "png")

def uploadFile(path):
    out = subprocess.check_output("pyupload.exe " + path + " --host=catbox")
    url = out.split()[-1]

    return url

def main():
    path = None

    # Use argument path or create temporary file
    if len(sys.argv) > 1:
        path = sys.argv[1]
        print("Uploading " + path + ".")
    else:
        saveClipboardTmp()
        path = TMP_FILE
        print("Uploading clipboard.")

    # Bytes object
    url = uploadFile(path)

    # Copy to clipboard
    subprocess.run("clip.exe", input=url)
    print(url.decode("utf-8") + " pasted to clipboard.")

    # Remove temporary file
    if path == TMP_FILE:
        os.remove(TMP_FILE)

main()
