import sys
import os
import subprocess
import urllib.request
import json
import lxml.html

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

        self.q    = args["query"]
        self.args = args
        self.page = None

        self.categoryCode = None
        self.parseCategory()

    def parseCategory(self):
        category = None

        if not "category" in self.args:
            category = self.DEFAULT_CATEGORY
        else:
            category = self.args["category"]

        if category in self.CATEGORIES:
            self.categoryCode = self.CATEGORIES[category]
        else:
            raise ValueError("Invalid category")

    def makeURL(self):
        return self.BASE_URL + "?f=" + self.FILTER + "&c=" + self.categoryCode + "&q=" + self.q\
             + "&s=" + self.SORT + "&o=" + self.ORDER

    def getPage(self):
        req = urllib.request.Request(self.makeURL())
        res = urllib.request.urlopen(req)
        self.page = res.read().decode("utf-8")

        return self

    def parseJSON(self):
        elems = []

        site = lxml.html.fromstring(self.page)
        trs  = site.xpath("//tr")

        for tr in trs:
            tds = tr.xpath("td")

            if tds:
                title    = tds[1].text_content().strip()
                size     = tds[3].text_content().strip()
                date     = tds[4].text_content().strip()
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

                elems.append({"title": title, "torrent": torrent, "magnet": magnet, "size": size, "time": date, "seeders": seeders, "leechers": leechers})

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
        self.args = args
        self.page = None

        self.categoryCode = None
        self.parseCategory()

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
    print(" N    " + V + " (S    |    L) " + V + "   Size    " + V +"    Date    " + V + "   Title")
    print(H*(6) + CROSS + H*(15) + CROSS+H*(11) + CROSS + H*12 + CROSS + H*(TERMINAL_WIDTH-50) )

def printLine(elem, i):
    sizeN, sizeUnits = elem["size"].split()
    sizeColumn = (g(sizeN) + " " + sizeUnits).ljust(21, " ")
    date = "-".join([ g(part) for part in elem["time"].split()[0].split("-") ])

    print(("[" + b(str(i)) + "]").ljust(16, " ") + " " + V
         + " (" + g(elem["seeders"].ljust(4)) + " | " + g(elem["leechers"].rjust(4)) + ") " + V
         + " " + sizeColumn + V
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
    args = { "isVlc": False, "n": 99999, "type": "query", "index": None, "query": None, "site": "nyaa" }

    if "--vlc" in sys.argv:
        args["isVlc"] = True
        sys.argv.remove("--vlc")

    if "--n" in sys.argv:
        i = sys.argv.index("--n")
        n = int(sys.argv[i+1]) # No length check

        args["n"] = n
        sys.argv = sys.argv[:i] + sys.argv[i+2:]

    if "--category" in sys.argv:
        i = sys.argv.index("--category")
        category = sys.argv[i+1] # No length check

        args["category"] = category
        sys.argv = sys.argv[:i] + sys.argv[i+2:]

    if "--site" in sys.argv:
        i = sys.argv.index("--site")
        site = sys.argv[i+1] # No length check

        args["site"] = site
        sys.argv = sys.argv[:i] + sys.argv[i+2:]

    # Hope it doesnt mess up with a query
    if "download" in sys.argv:
        i = sys.argv.index("download")
        n = int(sys.argv[i+1]) # No length check

        args["type"] = "download"
        args["index"] = n
        sys.argv = sys.argv[:i] + sys.argv[i+2:]

    if "magnet" in sys.argv:
        i = sys.argv.index("magnet")
        n = int(sys.argv[i+1]) # No length check

        args["type"] = "magnet"
        args["index"] = n
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
    torrent [query] [--n] [--site]    : Makes a query
    torrent download <index> [--vlc]  : Downloads a query index
    torrent magnet <index>            : Prints the magnet of an index to the terminal
    torrent deleteTmp                 : Deletes temporary files

    Arguments:
        --n    : Number of files to be shown
        --site : The site to be queried
        --vlc  : Play on vlc after download
""")
    else:
        args = parseArgs()

        if args["type"] == "query" and args["query"] == "":
            print("Empty query.\n")
        elif args["type"] == "download" and args["index"] == None:
            print("No download index.\n")
        elif args["type"] == "query":
            #printTable(json.loads(open(TMPFILE, "ra").read().strip()))

            res = getJson(args)
            printTable(res, args["n"])
            saveTmp(res)

            #print(nyaa(args["query"])._getJson())
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
