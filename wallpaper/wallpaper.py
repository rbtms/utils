#
# Script to set a random wallpaper on windows from 4chan
# Usage: wallpaper.py [board]
#
# Requires: requests (pip)
#

import os
import sys
import time
import requests
import ctypes
from random import randint

MIN_W = 1900
MIN_H = 1080

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

    def getPages(self):
        self.pages = requests.get(
            "https://a.4cdn.org/" + self.name + "/threads.json"
        ).json()

    def getPosts(self, threadNo):
        self.posts = requests.get(
            "https://a.4cdn.org/" + self.name
            + "/thread/" + str(threadNo) + ".json"
        ).json()["posts"]

    def getImg(self, imageId, ext):
        return requests.get(
            "https://i.4cdn.org/" + self.name + "/" + str(imageId) + ext
        )

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

                if res.status_code == 200:
                    return res.content

def setWallpaper(path):
    path = os.path.abspath(path)
    ctypes.windll.user32.SystemParametersInfoW(20, 0, path, 0)

def main():
    boardName = sys.argv[1] if len(sys.argv) > 1 else "wg"
    tmp = "tmp.png"

    board = Board(boardName)
    img = board.randomImg()

    f = open(tmp, "wb")
    f.write(img)
    f.close()

    setWallpaper(tmp)
    
    time.sleep(0.2)
    os.remove(tmp)

main()

