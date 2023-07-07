import urllib.request
import lxml.html

class Nyaa:
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

    TABLE_HEADERS = ["  N   ", " (S    |    L) ", "    Size    ", "    Date    ", "   Title"]
    TABLE_WIDTHS  = [6, 15, 12, 12, -50]

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

    def getPage(self):
        req = urllib.request.Request(self.makeURL(), headers=self.HEADERS)
        res = urllib.request.urlopen(req)
        self.page = res.read().decode("utf-8")

        return self

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

class Sukebei(Nyaa):
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
