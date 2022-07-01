file=$1
arg1=$2
arg2=$3
pythonCmd="python3"
ffPath='/mnt/c/Program Files/Mozilla Firefox/firefox.exe'

if [[ $file = *.py ]]
then
    if [ "$arg1" = "--lines" ]
    then
        $pythonCmd -m pprofile --threads 0 $file
    elif [ "$arg1" = "--lines2" ]
    then
        $pythonCmd -m kernprof -l $file
        $pythonCmd -m line_profiler "$file.lprof"

        sleep 1 # To prevent trying to load a file which is already deleted
        rm "$file.lprof"
    elif [ "$arg1" = "--top" ]
    then
        py-spy.exe top -- python $file
    elif [ "$arg1" = "--flamegraph" ]
    then
        outputFile="profile.svg" # For some reason python -m doesnt work on WSL

        py-spy.exe record -o $outputFile -- python $file
        "$ffPath" $(wslpath -w $outputFile)
        
        sleep 1 # To prevent trying to show a svg which is already deleted
        rm $outputFile
    else
        #echo "profile"
        $pythonCmd -m cProfile $file
    fi
else
    echo "Usage: profile.sh FILE [OPTIONS]"
    echo ""
    echo "Options:"
    echo "    Python: --lines      : Line profiler (pprofiler)"
    echo "            --lines2     : Line profiler (line_profiler). Takes less time. Remember to use @profile tags."
    echo "            --top        : Show profiling on top in real time (py-spy)"
    echo "            --flamegraph : Flamegraph profiler (py-spy)"
    echo ""
fi
