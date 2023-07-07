#!/usr/bin/python3

import sys
import os
import subprocess
import json

from Screen.Table import Table

from Sites.Nyaa      import Nyaa, Sukebei
from Sites.Piratebay import Piratebay
from Sites._1337x    import _1337x

TMPFILE = '/tmp/_tmp.json'
PATH_DELUGE = 'deluge'
USAGE = """
Usage:
    torrent <query> [args]   : Makes a query
    torrent download <index> : Downloads a query index
    torrent deluge <index>   : Add the index to deluge's query
    torrent magnet <index>   : Prints the magnet of an index to the terminal
    torrent deleteTmp        : Deletes temporary files

    Arguments:
        --n    : Number of files to be shown
        --site : The site to be queried
        --page : The number of the page
"""

#
# Load temporary results file
#
def loadTmp():
    if os.path.isfile(TMPFILE):
        tmpFile = open(TMPFILE, "r")
        tmp = json.loads(tmpFile.read().strip())
        tmpFile.close()

        return tmp
    else:
        print("There are no previous queries stored. You have to make a query first.\n")
        sys.exit()

#
# Save query results into temporary file
#
def saveTmp(res):
    with open(TMPFILE, 'w', encoding='utf8') as tmpFile:
        json.dump(res, tmpFile)

#
# Add index item to deluge
#
def addDeluge(tmp, i):
    magnet = getMagnet(tmp, i)
    os.system("\"{0}\" \"{1}\" &".format(PATH_DELUGE, magnet))

#
# Get magnet of index
#
def getMagnet(tmp, i):
    if tmp[i]["site"] == "1337x":
        return _1337x.get_magnet(tmp[i]["url"])
    else:
        return tmp[i]["magnet"]

#
# Download magnet from index
#
def downloadMagnet(tmp, i):
    subprocess.run(["webtorrent", getMagnet(tmp, i)])

#
# Parse command line arguments
#
def parseArgs():
    args = { "n": 99999, "type": "query", "index": None,
             "query": None, "category": None, "page": "1", "site": "nyaa" }

    # Arguments
    for arg in ["n", "page", "category", "site"]:
        if "--" + arg in sys.argv:
            i = sys.argv.index("--" + arg)
            val = sys.argv[i+1] # No length check

            args[arg] = int(val) if arg == 'n' else val
            sys.argv = sys.argv[:i] + sys.argv[i+2:]

    # Modes with an index
    for mode in ["download", "magnet", "deluge"]:
        if mode in sys.argv:
            i = sys.argv.index(mode)
            index = int(sys.argv[i+1])

            args["type"]  = mode
            args["index"] = index
            sys.argv = sys.argv[:i] + sys.argv[i+2:]

    if "list" in sys.argv:
        args["type"] = "list"
        sys.argv.remove("list")

    if "deleteTmp" in sys.argv:
        args["type"] = "deleteTmp"
        sys.argv.remove("deleteTmp")

    # Parse query
    args["query"] = " ".join(sys.argv[1:])

    return args

#
# Site object builder from arguments
#
def buildSite(args):
    if   args['site'] == 'nyaa'     : return Nyaa(args)
    elif args['site'] == 'sukebei'  : return Sukebei(args)
    elif args['site'] == 'piratebay': return Piratebay(args)
    elif args['site'] == '1337x'    : return _1337x(args)
    else: raise ValueError('Invalid site: ' + args.site)

#
# Make a query and save the results to a temporary file
#
def makeQuery(site, limit):
    site.getPage().parseJSON()

    table = Table(site)
    table.printTable(limit)

    saveTmp(site.elems)

#
# Download index in temporary results file
#
def downloadTmpIndex(index):
    tmp = loadTmp()
    downloadMagnet(tmp, index)

#
# List temporary results
#
def listTmp(site, limit):
    tmp = loadTmp()
    site.elems = tmp

    table = Table(site)
    table.printTable(limit)

def main():
    if len(sys.argv) == 1:
        print(USAGE)
    else:
        args = parseArgs()
        site = buildSite(args)

        # The type is query but no actual query argument
        if args["type"] == "query" and args["query"] == "":
            print("Empty query.\n")
        # The type is download but there is no index
        elif args["type"] == "download" and args["index"] is None:
            print("No download index.\n")
        # Make a query
        elif args["type"] == "query":
            makeQuery(site, args['n'])
        # Download torrent
        elif args["type"] == "download":
            downloadTmpIndex(args['index'])
        # Print magnet
        elif args["type"] == "magnet":
            print(getMagnet(loadTmp(), args['index']))
        # Add site to deluge
        elif args["type"] == "deluge":
            addDeluge(loadTmp(), args["index"])
        elif args["type"] == "list":
            listTmp(site, args['n'])
        elif args["type"] == "deleteTmp":
            os.remove(TMPFILE)
            print("Temporary files deleted.\n")

main()
