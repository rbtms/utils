#
# Script to set a random wallpaper on windows (WSL) from multiple pages
# Usage: wallpaper.py [board]
#

import os
import sys
import urllib.request
import json
import time
import ctypes
from random import randint

MIN_W = 1900
MIN_H = 1080
TMP_IMG_PATH = "/tmp/tmp_wallpaper.png"

class Board:
    def __init__(self, name):
        self.name = name

        self.pages = []
        self.threads = []
        self.posts = []

    def takeRandom(self, arr):
        elem = arr[randint(0, len(arr)-1)]
        arr.remove(elem)

        return elem
    
    def getURL(self, url):
        req = urllib.request.Request(url)
        res = urllib.request.urlopen(req)
        return res

    def getPages(self):
        res = self.getURL("https://a.4cdn.org/" + self.name + "/threads.json")
        self.pages = json.loads(res.read().decode("utf-8"))

    def getPosts(self, threadNo):
        res = self.getURL("https://a.4cdn.org/" + self.name + "/thread/" + str(threadNo) + ".json")
        self.posts = json.loads(res.read().decode("utf-8"))["posts"]

    def getImg(self, imageId, ext):
        return self.getURL("https://i.4cdn.org/" + self.name + "/" + str(imageId) + ext)

    def takeRandomPage(self):
        if not self.pages:
            self.getPages()

        self.threads = self.takeRandom(self.pages)["threads"]

    def takeRandomThread(self):
        if not self.threads:
            self.takeRandomPage()

        self.getPosts(self.takeRandom(self.threads)["no"])

    def randomImg(self):
        while True:
            if not self.posts:
                self.takeRandomThread()

            post = self.takeRandom(self.posts)

            if "w" in post and "h" in post and post["w"] >= MIN_W and post["h"] >= MIN_H:
                res = self.getImg(post["tim"], post["ext"])

                if res.msg == "OK":
                    return res.read()

class Unsplash(Board):
    def __init__(self, q):
        endpoint    = "https://api.unsplash.com/search/photos/"
        client_id   = "SEfftQdo-yjLo2DyETyvLBY-G6TzDMkRSyb7tSeeZZg"
        orientation = "landscape"
        query       = "+".join(q.split())

        self.url = endpoint + "?client_id=" + client_id + "&query=" + query + "&orientation" + orientation

    def randomImg(self):
        j = json.loads( self.getURL(self.url).read().decode("utf-8") )
        imgURL = self.takeRandom(j["results"])["urls"]["raw"]

        res = self.getURL(imgURL)

        if res.msg == "OK":
            return res.read()
        else:
            raise ValueError("The picture could not be retrieved.")

def setWallpaper(path):
    path = os.path.abspath(path)
    ctypes.windll.user32.SystemParametersInfoW(20, 0, path, 3)

def deleteTmp(tmp):
    try:
        os.remove(tmp)
    except:
        time.sleep(0.1)
        deleteTmp(tmp)

def main():
    boardName = sys.argv[1] if len(sys.argv) > 1 else "wg"
    img = None

    if boardName == "unsplash":
        if len(sys.argv) != 3:
            raise ValueError("Incorrect number of arguments.")
        else:
            q   = sys.argv[2]
            img = Unsplash(q).randomImg()
    else:
        img = Board(boardName).randomImg()

    f = open(TMP_IMG_PATH, "wb")
    f.write(img)
    f.close()

    setWallpaper(TMP_IMG_PATH)

    time.sleep(0.2)
    deleteTmp(TMP_IMG_PATH)

main()
