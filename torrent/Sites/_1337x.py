import urllib.request
import lxml.html

PATH_GECKO = '/usr/bin/scripts/geckodriver'

class _1337x:
    BASE_SEARCH_URL = "https://1337x.torrentbay.to/search"
    BASE_CATEGORY_URL = "https://1337x.torrentbay.to/category-search"
    ORDERBY  = "99" # Seeders i guess

    TABLE_HEADERS = ["  N   ", " (S    |    L) ", "    Size    ", "    Date    ", "  Uploader  ", "   Title"]
    TABLE_WIDTHS  = [6, 15, 12, 12, 12, -70]

    def __init__(self, args):
        self.pageN = args["page"]
        self.q = self.parseQuery(args["query"])
        self.page = None

        self.mode = "CATEGORY" if args["category"] is not None else "SEARCH"
        self.category = args["category"]
        self.elems = []

    @staticmethod
    def makeBrowser():
        # Import here so that there is no overhead load time for other sites
        from selenium import webdriver
        from selenium.webdriver.firefox.service import Service

        options = webdriver.FirefoxOptions()
        options.add_argument('--headless')

        service = Service(PATH_GECKO)

        return webdriver.Firefox( options=options, service=service )

    @staticmethod
    def getPageSource(url):
        browser = _1337x.makeBrowser()
        browser.get('https://torrentbay.to')
        browser.get(url)

        source = browser.page_source

        browser.quit()

        return source

    def getPage(self):
        self.page = _1337x.getPageSource(self.makeURL())

        return self

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
        try:
            m, d, y = time.split()

            month_n = { "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04",
                        "May": "05", "Jun": "06", "Jul": "07", "Aug": "08",
                        "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12" }

            month = "Err" if m[:-1] not in month_n else month_n[m[:-1]]
            day   = d[:-2].zfill(2)
            year  = "20" + y[1:]

            return year + "-" + month + "-" + day
        except:
            #print('[Error parseTime()] Couldn\'t parse date: ', time)
            return "Error"

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
        xpath_magnet = "/html/body/main/div/div/div/div[2]/div[1]/ul[1]/li[1]/a"

        page = _1337x.getPageSource(url)
        site = lxml.html.fromstring(page)
        magnet = site.xpath(xpath_magnet)[0].get("href")

        return magnet


