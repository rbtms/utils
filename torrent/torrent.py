import sys
import os
import subprocess
import urllib.request
import json
import lxml.html
from datetime import datetime

def r(s): return "\033[0;31m"+s+"\033[0m"
def b(s): return "\033[0;34m"+s+"\033[0m"
def g(s): return "\033[0;32m"+s+"\033[0m"

TERMINAL_WIDTH = os.get_terminal_size().columns
TMPFILE = "/tmp/_tmp.json"
VLCPATH = "/mnt/c/Program Files/VideoLAN/VLC/vlc.exe"

V     = r("┃")
H     = r("━")
CROSS = r("╋")

class nyaa:
    def __init__(self, args):
        self.BASE_URL = "https://nyaa.si/"
        self.FILTER   = "0"
        self.SORT     = "seeders"
        self.ORDER    = "desc"

        self.DEFAULT_CATEGORY = "raw"
        self.CATEGORIES = {
            "all"       : "0_0",
            "anime"     : "1_0",
            "raw"       : "1_4",
            "audio"     : "2_0",
            "manga"     : "3_1",
            "rawmanga"  : "3_3",
            "games"     : "6_2"
        }

        self.q     = args["query"]
        self.pageN = args["page"]

        self.category = args["category"] or self.DEFAULT_CATEGORY
        self.categoryCode = None
        self.parseCategory()

        self.page = None

    def parseCategory(self):
        if self.category in self.CATEGORIES:
            self.categoryCode = self.CATEGORIES[self.category]
        else:
            raise ValueError("Invalid category: " + self.category + ".")

    def makeURL(self):
        return self.BASE_URL + "?f=" + self.FILTER + "&p=" + self.pageN + "&c=" + self.categoryCode + "&q=" + self.q\
             + "&s=" + self.SORT + "&o=" + self.ORDER

    def getPage(self):
        req = urllib.request.Request(self.makeURL())
        res = urllib.request.urlopen(req)
        self.page = res.read().decode("utf-8")

        return self

    def parseJSON(self):
        elems = []

        site = lxml.html.fromstring(self.page)
        trs  = site.xpath("//tbody/tr")

        for tr in trs:
            tds = tr.xpath("td")

            if tds:
                title    = tds[1].text_content().strip()
                size     = tds[3].text_content().strip()
                time     = tds[4].text_content().strip()
                seeders  = tds[5].text_content().strip()
                leechers = tds[6].text_content().strip()

                urls = tds[2].xpath("a/@href")
                
                if len(urls) == 1:
                    magnet = urls[0]
                    torrent = None
                else:
                    torrent = urls[0]
                    magnet  = urls[1]

                #   Remove comment number
                if title[1] == "\n": # 1 digit comment number
                    title = title[1:].strip()
                elif title[2] == "\n": # 2 digit comment number
                    title = title[2:].strip()
                elif title[3] == "\n": # 3 digit comment number
                    title = title[3:].strip()

                elems.append({"title": title, "torrent": torrent, "magnet": magnet, "size": size, "time": time, "seeders": seeders, "leechers": leechers})

        return elems

class sukebei(nyaa):
    def __init__(self, args):
        self.BASE_URL = "https://sukebei.nyaa.si/"
        self.FILTER   = "0"
        self.SORT     = "seeders"
        self.ORDER    = "desc"

        self.DEFAULT_CATEGORY = "doujinshi"
        self.CATEGORIES = {
            "all"       : "0_0",
            "anime"     : "1_1",
            "doujinshi" : "1_2",
            "games"     : "1_3",
            "manga"     : "1_4",
            "pictures"  : "1_5"
        }

        self.q    = args["query"]
        self.pageN = args["page"]

        self.category = args["category"] or self.DEFAULT_CATEGORY
        self.categoryCode = None
        self.parseCategory()

        self.page = None

class piratebay:
    def __init__(self, args):
        self.BASE_URL = "https://unblocked.knaben.info/s/?search/"
        self.ORDERBY  = "99" # Seeders i guess
        self.HEADERS = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11'
       }

        self.pageN = args["page"]
        self.q    = args["query"]
        self.page = None

    def makeURL(self):
        return self.BASE_URL + self.q + "/" + self.pageN + "/" + self.ORDERBY + "/0"

    def getPage(self):
        req = urllib.request.Request(self.makeURL(), headers=self.HEADERS)
        res = urllib.request.urlopen(req)
        self.page = res.read().decode("utf-8")

        return self
    
    def parseTime(self, time):
        y, m, d = None, None, None

        if time[0] == "Today":
            y = str(datetime.now().year)
            m = str(datetime.now().month).zfill(2)
            d = str(datetime.now().day).zfill(2)
        else:
            m, d = time[0].split("-")

            if ":" in time[1]:
                y = str(datetime.now().year)
            else:
                y = time[1][:-1]

        return y + "/" + m + "/" + d
    
    def parseJSON(self):
        site = lxml.html.fromstring(self.page)
        elems = []

        # First one is the header
        # Last one is the index
        for tr in site.xpath("//tr")[1:-1]:
            tds = tr.xpath("td")

            if tds:
                elemType = tds[0].text_content().strip().split()[0]
                title  = tds[1].xpath("div")[0].text_content().strip()
                magnet = tds[1].xpath("a/@href")[0].strip()

                timeSizeUploader = tds[1].xpath("font")[0].text_content().strip()
                time     = self.parseTime(timeSizeUploader.split()[1:3])
                size     = " ".join(timeSizeUploader.split()[4:6])[:-1]
                uploader = timeSizeUploader.split()[-1]
                
                seeders  = tds[2].text_content().strip()
                leechers = tds[3].text_content().strip()

                elems.append({
                    "elemType"  : elemType,
                    "title"     : title,
                    "magnet"    : magnet,
                    "time"      : time,
                    "size"      : size,
                    "uploader"  : uploader,
                    "seeders"   : seeders,
                    "leechers"  : leechers
                })

        return elems

def loadTmp():
    if os.path.isfile(TMPFILE):
        tmpFile = open(TMPFILE, "r")
        tmp = json.loads(tmpFile.read().strip())
        tmpFile.close()

        return tmp
    else:
        print("There are no previous queries stored. You have to make a query first.\n")
        sys.exit()

def saveTmp(res):
    tmpFile = open(TMPFILE, "w")
    json.dump(res, tmpFile)
    tmpFile.close()

def printHeader():
    print()
    print(" N    " + V + " (S    |    L) " + V + "    Size    " + V +"    Date    " + V + "   Title")
    print(H*6 + CROSS + H*15 + CROSS+H*12 + CROSS + H*12 + CROSS + H*(TERMINAL_WIDTH-50) )

def printLine(elem, i):
    sizeN, sizeUnits = elem["size"].split()
    sizeColumn = (g(sizeN) + " " + sizeUnits).ljust(21, " ")
    date = "-".join([ g(part) for part in elem["time"].split()[0].split("-") ])

    print(("[" + b(str(i)) + "]").ljust(16, " ") + " " + V
         + " (" + g(elem["seeders"].ljust(4)) + " | " + g(elem["leechers"].rjust(4)) + ") " + V
         + " " + sizeColumn + " " + V
         + " " + date + " " + V
         + " " + elem["title"][:TERMINAL_WIDTH-70])

def printTable(elems, n):
    printHeader()

    for i, elem in enumerate(elems[:n]):
        printLine(elem, i)

    print()

def getJson(args):
    if args["site"] == "nyaa":
        return nyaa(args).getPage().parseJSON()
    elif args["site"] == "sukebei":
        return sukebei(args).getPage().parseJSON()
    elif args["site"] == "piratebay":
        return piratebay(args).getPage().parseJSON()

def playDownload(tmp, i):
    if os.path.isfile(VLCPATH):
        subprocess.run([VLCPATH, tmp[i]["title"]])
    else:
        print("There is no VLC binary on that path.")
        sys.exit()

def printMagnet(tmp, i):
    print(tmp[i]["magnet"])

def downloadMagnet(tmp, i, isVlc):
    magnet = tmp[i]["magnet"]

    args = ["webtorrent", magnet]
    #if isVlc: args.append("--vlc")

    subprocess.run(args)

def parseArgs():
    args = { "isVlc": False, "n": 99999, "type": "query", "index": None,
             "query": None, "category": None, "page": "1", "site": "nyaa" }

    if "--vlc" in sys.argv:
        args["isVlc"] = True
        sys.argv.remove("--vlc")

    # Arguments
    for arg in ["n", "page", "category", "site"]:
        if "--" + arg in sys.argv:
            i = sys.argv.index("--" + arg)
            val = sys.argv[i+1] # No length check

            args[arg] = val
            sys.argv = sys.argv[:i] + sys.argv[i+2:]

    # Modes with an index
    for mode in ["download", "magnet"]:
        if mode in sys.argv:
            i = sys.argv.index(mode)
            index = int(sys.argv[i+1])

            args["type"]  = mode
            args["index"] = index
            sys.argv = sys.argv[:i] + sys.argv[i+2:]

    if "deleteTmp" in sys.argv:
        args["type"] = "deleteTmp"
        sys.argv.remove("deleteTmp")

    args["query"] = urllib.parse.quote("+".join(sys.argv[1:]))

    return args

def main():
    if len(sys.argv) == 1:
        print("""
Usage:
    torrent <query> [args]            : Makes a query
    torrent download <index> [--vlc]  : Downloads a query index
    torrent magnet <index>            : Prints the magnet of an index to the terminal
    torrent deleteTmp                 : Deletes temporary files

    Arguments:
        --n    : Number of files to be shown
        --site : The site to be queried
        --page : The number of the page
        --vlc  : Play on vlc after download
""")
    else:
        args = parseArgs()

        if args["type"] == "query" and args["query"] == "":
            print("Empty query.\n")
        elif args["type"] == "download" and args["index"] == None:
            print("No download index.\n")
        elif args["type"] == "query":
            res = getJson(args)
            printTable(res, int(args["n"]))
            saveTmp(res)
        elif args["type"] == "download":
            tmp = loadTmp()
            downloadMagnet(tmp, args["index"], args["isVlc"])

            # Because --vlc fails
            if args["isVlc"]:
                playDownload(tmp, args["index"])
        elif args["type"] == "magnet":
            tmp = loadTmp()
            printMagnet(tmp, args["index"])
        elif args["type"] == "deleteTmp":
            os.remove(TMPFILE)
            print("Temporary files deleted.\n")

main()

