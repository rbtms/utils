import urllib.request
from datetime import datetime
import lxml.html

class Piratebay:
    BASE_URL = "https://unblocked.knaben.info/s/?search/"
    ORDERBY  = "99" # Seeders i guess
    HEADERS = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11'}

    TABLE_HEADERS = ["  N   ", " (S    |    L) ", "    Size    ", "    Date    ", "  Uploader  ", "   Title"]
    TABLE_WIDTHS  = [6, 15, 12, 12, 12, -70]

    def __init__(self, args):
        self.pageN = args["page"]
        self.q = self.parseQuery(args["query"])
        self.page = None

        self.elems = []

    def __repr__(self):
        return "piratebay"

    def parseQuery(self, q):
        return urllib.parse.quote(q)

    def getPage(self):
        req = urllib.request.Request(self.makeURL(), headers=self.HEADERS)
        res = urllib.request.urlopen(req)
        self.page = res.read().decode("utf-8")

        return self

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


