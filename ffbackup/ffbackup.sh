appdata="/mnt/c/Users/Alvaro/AppData"
profilename="2y9zt01q.default-release"
fflocal="$appdata/local/mozilla/firefox/profiles"
ffroaming="$appdata/roaming/mozilla/firefox/profiles"
profile_local="$fflocal/$profilename"
profile_roaming="$ffroaming/$profilename"
backup_local="$fflocal/backup"
backup_roaming="$ffroaming/backup"

if [ "$1" = 'backup' ]
then
    echo "Remove local backup..."
    rm -r $backup_local
    echo "Remove roaming backup..."
    rm -r $backup_roaming
    echo "Backup local..."
    cp -r $profile_local $backup_local
    echo "Backup roaming..."
    cp -r $profile_roaming $backup_roaming
    echo "Done."
elif [ "$1" = 'restore' ]
then
    echo "Remove local..."
    rm -r $profile_local
    echo "Remove roaming..."
    rm -r $profile_roaming
    echo "Restore local..."
    cp -r $backup_local $profile_local
    echo "Restore roaming..."
    cp -r $backup_roaming $profile_roaming
    echo "Done."
else
    echo "Arguments: backup/restore."
fi
