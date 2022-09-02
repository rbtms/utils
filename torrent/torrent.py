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
DELUGEPATH = "deluge"

V     = r("┃")
H     = r("━")
CROSS = r("╋")

class Site:
    def getPage(self):
        req = urllib.request.Request(self.makeURL(), headers=self.HEADERS)
        res = urllib.request.urlopen(req)
        self.page = res.read().decode("utf-8")

        return self

    def printHeader(self):
        print()
        print(V.join(self.TABLE_HEADERS))
        
        for w in self.TABLE_WIDTHS[:-1]:
            print(H*w + CROSS, end="")

        print(H*self.TABLE_WIDTHS[-1])

    def printLine(self, elem, i, site="nyaa"):
        sizeN, sizeUnits = elem["size"].split()

        nColumn     = ("[" + b(str(i)) + "]").ljust(16) + " "
        slColumn    = " (" + g(elem["seeders"].ljust(4)) + " | " + g(elem["leechers"].rjust(4)) + ") "
        sizeColumn  = " " + (g(sizeN) + " " + sizeUnits).ljust(21) + " "
        dateColumn  = " " + "-".join([ g(part) for part in elem["time"].split()[0].split("-") ]) + " "
        titleColumn = " " + elem["title"][:TERMINAL_WIDTH-70]

        if repr(self) == "piratebay" or repr(self) == "1337x":
            uploaderColumn = " " + g(elem["uploader"][:10].ljust(11))
            print( nColumn + V + slColumn + V + sizeColumn + V + dateColumn + V + uploaderColumn + V + titleColumn)
        else: 
            print( nColumn + V + slColumn + V + sizeColumn + V + dateColumn + V + titleColumn)

    def printTable(self, n):
        self.printHeader()

        for i, elem in enumerate(self.elems[:n]):
            self.printLine(elem, i)

        print()

class nyaa(Site):
    BASE_URL = "https://nyaa.si/"
    FILTER   = "0"
    SORT     = "seeders"
    ORDER    = "desc"
    DEFAULT_CATEGORY = "raw"
    HEADERS = {}

    CATEGORIES = {
        "all"       : "0_0",
        "anime"     : "1_0",
        "raw"       : "1_4",
        "audio"     : "2_0",
        "manga"     : "3_1",
        "rawmanga"  : "3_3",
        "games"     : "6_2"
    }

    TABLE_HEADERS = [" N    ", " (S    |    L) ", "    Size    ", "    Date    ", "   Title"]
    TABLE_WIDTHS  = [6, 15, 12, 12, TERMINAL_WIDTH-50]

    def __init__(self, args):
        self.q     = self.parseQuery(args["query"])
        self.pageN = args["page"]

        self.page = None
        self.categoryCode = None
        self.category = args["category"] or self.DEFAULT_CATEGORY
        self.parseCategory()

        self.elems = []

    def __repr__(self):
        return "nyaa"

    def parseQuery(self, q):
        return urllib.parse.quote("+".join(q.split()))

    def parseCategory(self):
        if self.category in self.CATEGORIES:
            self.categoryCode = self.CATEGORIES[self.category]
        else:
            raise ValueError("Invalid category: " + self.category + ".")

    def makeURL(self):
        return self.BASE_URL + "?f=" + self.FILTER + "&p=" + self.pageN + "&c=" + self.categoryCode + "&q=" + self.q\
             + "&s=" + self.SORT + "&o=" + self.ORDER

    def parseJSON(self):
        html = lxml.html.fromstring(self.page)
        trs  = html.xpath("//tbody/tr")

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

                self.elems.append({"site": str(self), "title": title, "torrent": torrent, "magnet": magnet, "size": size,
                                   "time": time, "seeders": seeders, "leechers": leechers})

class sukebei(nyaa):
    BASE_URL = "https://sukebei.nyaa.si/"
    DEFAULT_CATEGORY = "doujinshi"
    CATEGORIES = {
        "all"       : "0_0",
        "anime"     : "1_1",
        "doujinshi" : "1_2",
        "games"     : "1_3",
        "manga"     : "1_4",
        "pictures"  : "1_5"
    }

    def __init__(self, args):
        self.q     = self.parseQuery(args["query"])
        self.pageN = args["page"]

        self.page = None
        self.categoryCode = None
        self.category = args["category"] or self.DEFAULT_CATEGORY
        self.parseCategory()

        self.elems = []

    def __repr__(self):
        return "sukebei"

class piratebay(Site):
    BASE_URL = "https://unblocked.knaben.info/s/?search/"
    ORDERBY  = "99" # Seeders i guess
    HEADERS = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11'}

    TABLE_HEADERS = [" N    ", " (S    |    L) ", "    Size    ", "    Date    ", "  Uploader  ", "   Title"]
    TABLE_WIDTHS  = [6, 15, 12, 12, 12, TERMINAL_WIDTH-70]

    def __init__(self, args):
        self.pageN = args["page"]
        self.q = self.parseQuery(args["query"])
        self.page = None

        self.elems = []

    def __repr__(self):
        return "piratebay"

    def parseQuery(self, q):
        return urllib.parse.quote(q)

    def makeURL(self):
        return self.BASE_URL + self.q + "/" + self.pageN + "/" + self.ORDERBY + "/0"

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

                self.elems.append({
                    "site"      : "piratebay",
                    "elemType"  : elemType,
                    "title"     : title,
                    "magnet"    : magnet,
                    "time"      : time,
                    "size"      : size,
                    "uploader"  : uploader,
                    "seeders"   : seeders,
                    "leechers"  : leechers
                })

class _1337x(Site):
    BASE_SEARCH_URL = "https://1337x.torrentbay.to/search"
    BASE_CATEGORY_URL = "https://1337x.torrentbay.to/category-search"
    ORDERBY  = "99" # Seeders i guess
    HEADERS = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11'}

    TABLE_HEADERS = [" N    ", " (S    |    L) ", "    Size    ", "    Date    ", "  Uploader  ", "   Title"]
    TABLE_WIDTHS  = [6, 15, 12, 12, 12, TERMINAL_WIDTH-70]

    def __init__(self, args):
        self.pageN = args["page"]
        self.q = self.parseQuery(args["query"])
        self.page = None

        self.mode = "CATEGORY" if args["category"] is not None else "SEARCH"
        self.category = args["category"]
        self.elems = []

    def __repr__(self):
        return "1337x"

    def parseQuery(self, q):
        return urllib.parse.quote(q)

    def makeURL(self):
        if self.mode == "SEARCH":
            return self.BASE_SEARCH_URL + "/" + self.q + "/" + self.pageN + "/"
        else:
            category = self.category[0].upper() + self.category[1:]
            return self.BASE_CATEGORY_URL + "/" + self.q + "/" + category + "/" + self.pageN + "/"

    def parseTime(self, time):
        m, d, y = time.split()
        
        month_n = { "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04",
                    "May": "05", "Jun": "06", "Jul": "07", "Aug": "08",
                    "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12" }

        month = m[:-1] if m[:-1] not in month_n else month_n[m[:-1]]
        day   = d[:-2].zfill(2)
        year  = "20" + y[1:]

        return year + "-" + month + "-" + day
    
    def parseJSON(self):
        site = lxml.html.fromstring(self.page)

        # First one is the header
        # Last one is the index
        for tr in site.xpath("//tr")[1:-1]:
            tds = tr.xpath("td")

            if tds:
               #elemType = tds[0].text_content().strip().split()[0]
               title     = tds[0].xpath("a")[1].text_content()
               url       = "https://1337x.torrentbay.to" + tds[0].xpath("a")[1].get("href")
               seeders   = tds[1].text_content().split()[0].strip()
               leechers  = tds[2].text_content().split()[0].strip()
               time      = self.parseTime( tds[3].text_content() )
               size      = tds[4].xpath("text()")[0]
               uploader  = tds[5].text_content().strip()

               self.elems.append({
                   "site"      : "1337x",
                   "title"     : title,
                   "url"       : url,
                   "magnet"    : "",
                   "time"      : time,
                   "size"      : size,
                   "uploader"  : uploader,
                   "seeders"   : seeders,
                   "leechers"  : leechers
               })

    @staticmethod
    def get_magnet(url):
        HEADERS = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11'}
        xpath_magnet = "/html/body/main/div/div/div/div[2]/div[1]/ul[1]/li[1]/a"

        req = urllib.request.Request(url, headers=HEADERS)
        res = urllib.request.urlopen(req)
        page = res.read().decode("utf-8")

        site = lxml.html.fromstring(page)
        magnet = site.xpath(xpath_magnet)[0].get("href")

        return magnet

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

def playDownload(tmp, i):
    if os.path.isfile(VLCPATH):
        subprocess.run([VLCPATH, tmp[i]["title"]])
    else:
        print("There is no VLC binary on that path.")
        sys.exit()

def addDeluge(tmp, i):
    magnet = getMagnet(tmp, i)
    os.system("\"{0}\" \"{1}\" &".format(DELUGEPATH, magnet))

def getMagnet(tmp, i):
    if tmp[i]["site"] == "1337x":
        return _1337x.get_magnet(tmp[i]["url"])
    else:
        return tmp[i]["magnet"]

def downloadMagnet(tmp, i):
    subprocess.run(["webtorrent", getMagnet(tmp, i)])

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
    for mode in ["download", "magnet", "deluge"]:
        if mode in sys.argv:
            i = sys.argv.index(mode)
            index = int(sys.argv[i+1])

            args["type"]  = mode
            args["index"] = index
            sys.argv = sys.argv[:i] + sys.argv[i+2:]

    if "deleteTmp" in sys.argv:
        args["type"] = "deleteTmp"
        sys.argv.remove("deleteTmp")

    # Parse query
    args["query"] = " ".join(sys.argv[1:])

    return args

def main():
    if len(sys.argv) == 1:
        print("""
Usage:
    torrent <query> [args]            : Makes a query
    torrent download <index> [--vlc]  : Downloads a query index
    torrent deluge <index>            : Add the index to deluge's query
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

        site = None
        if   args["site"] == "nyaa"     : site = nyaa(args)
        elif args["site"] == "sukebei"  : site = sukebei(args)
        elif args["site"] == "piratebay": site = piratebay(args)
        elif args["site"] == "1337x"    : site = _1337x(args)
        else: raise ValueError("Invalid site.")

        if args["type"] == "query" and args["query"] == "":
            print("Empty query.\n")
        elif args["type"] == "download" and args["index"] == None:
            print("No download index.\n")
        elif args["type"] == "query":
            site.getPage().parseJSON()
            site.printTable(int(args["n"]))

            saveTmp(site.elems)
        elif args["type"] == "download":
            tmp = loadTmp()
            downloadMagnet(tmp, args["index"])

            if args["isVlc"]:
                playDownload(tmp, args["index"])
        elif args["type"] == "magnet":
            print(getMagnet(loadTmp(), args["index"]))
        elif args["type"] == "deluge":
            addDeluge(loadTmp(), args["index"])
        elif args["type"] == "deleteTmp":
            os.remove(TMPFILE)
            print("Temporary files deleted.\n")

main()
