#!/bin/bash

# Small utility to clean temporary files and logs

home="/home/alvaro"
tmp="/tmp"

# Clean cache folders
rm -rf $home/.cache

# Clean history files
rm -f $home/.bash_history
rm -f $home/.python_history
rm -f $home/.node_repl_history
rm -f $home/.viminfo

# Clean recent documents
rm -r $home/.local/share/RecentDocuments/*
rm $home/.local/share/recently-used.xbel*
rm $home/.local/share/user-places.xbel*

# Clear pylint temporary folder
rm -rf $home/.pylint.d

# Clean temporary folders
if [[ "$1" = "--all" ]]
then
    yes | sudo rm -r $tmp/*
    yes | sudo rm -r $tmp/.*
else
    yes | rm -r $tmp/*
    yes | rm -r $tmp/.*
fi

# Clear clipboard
# Windows
#echo "" | clip.exe
# KDE
qdbus org.kde.klipper /klipper org.kde.klipper.klipper.clearClipboardHistory


