import os

TERMINAL_WIDTH = os.get_terminal_size().columns

class ANSI:
    @staticmethod
    def r(s): return "\033[0;31m"+s+"\033[0m"
    @staticmethod
    def b(s): return "\033[0;34m"+s+"\033[0m"
    @staticmethod
    def g(s): return "\033[0;32m"+s+"\033[0m"

V     = ANSI.r("┃")
H     = ANSI.r("━")
CROSS = ANSI.r("╋")

########################################
# Render site results on an ANSI table #
########################################
class Table:
    def __init__(self, site):
        self.table_headers = site.TABLE_HEADERS
        self.table_widths  = [TERMINAL_WIDTH+n if n < 0 else n for n in site.TABLE_WIDTHS ]
        self.elems = site.elems
        self.sitename = repr(site)

    #
    # Print table header
    #
    def printHeader(self):
        print()
        print(V.join(self.table_headers))

        for w in self.table_widths[:-1]:
            print(H*w + CROSS, end="")

        print(H*self.table_widths[-1])

    #
    # Print table row
    #
    def printRow(self, elem, i):
        sizeN, sizeUnits = elem["size"].split()

        nColumn = ' [{ncol}'.format(
            ncol=(ANSI.b(str(i)) + ']').ljust(15)
        )
        slColumn = ' ({seeders} | {leechers}) '.format(
                seeders  = ANSI.g(elem["seeders"].ljust(4)),
                leechers = ANSI.g(elem["leechers"].rjust(4))
        )
        sizeColumn  = ' {size} '.format(
            size = (ANSI.g(sizeN) + " " + sizeUnits).ljust(21)
        )
        dateColumn = ' {date}'.format(
            date = ("-".join([ ANSI.g(part) for part in elem["time"].split()[0].split("-") ]) + " ")
                .ljust(22)
        )
        titleColumn = ' {title}'.format(
            title = elem["title"][:TERMINAL_WIDTH-70]
        )

        if self.sitename in ('piratebay', '1337x'):
            uploaderColumn = ' {uploader}'.format( uploader = ANSI.g(elem["uploader"][:10].ljust(11)) )

            row = V.join([nColumn, slColumn, sizeColumn, dateColumn, uploaderColumn, titleColumn])
            print(row)
        else:
            row = V.join([nColumn, slColumn, sizeColumn, dateColumn, titleColumn])
            print(row)

    #
    # Print whole table
    #
    def printTable(self, limit):
        self.printHeader()

        for i, elem in enumerate(self.elems[:limit]):
            self.printRow(elem, i)

        print()
