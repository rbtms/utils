### Name:
###   - imgtoxterm.py
###
### Version:
###   - v0.1
###
### License:
###   - GPL v3.0:
###    
###    This program is free software: you can redistribute it and/or modify
###    it under the terms of the GNU General Public License as published by
###    the Free Software Foundation, either version 3 of the License, or
###    (at your option) any later version.
###
###    This program is distributed in the hope that it will be useful,
###    but WITHOUT ANY WARRANTY; without even the implied warranty of
###    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
###    GNU General Public License for more details.
###
###
### Description:
###   - Script to convert images into xterm-friendly AA
###
### Commands:
###   - -f:    image file to load
###   - -r:    width-height ratio of the AA (0.1-10)
###   - -s:    size of the AA
###   - -p:    print image at the end
###   - -fill: fill the background of every letter with its correspondent color
###   - -na:   shows only background color, use with -fill
###   - -c:    character pool to use in the AA
###   - -o:    output sh file
###   - -font: font to use with -save
###   - -fs:   font size to use with -save
###   - -save: convert AA again into an image and save it
###
### Outputs:
###   - hexblock.txt:   hex block containing the position and colour in hex format of the AA
###   - xtermblock.txt: the same as hexblock.txt, only with xterm approximations
###   - image.sh:       output script ready to print the AA on execution
###   - image.bmp:      image of the AA
###
### Author:
###   - Alvaro Fernandez (nishinishi9999 at gmail.com)
###
### Thanks to:
###   - Micah Elliot for colortrans.py (https://gist.github.com/MicahElliott/719710), modified and renamed as hextoxterm.py
###

from PIL        import Image;
from subprocess import call;
import sys;
import os;
import random;
import hextoxterm;
import time;

def format_string(xterm):
    code  = '38' if fill == 0 else '48';
    start = '\e['+code+';5;'+str(xterm)+'m';
    end   = '\e[0m';
    char  = get_random_char() if na == 0 else " ";
    
    return start+char+end;

def get_random_char():
    if charpool == "":
        letters = list("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
    else:
        letters = list(charpool);
        
    return letters[random.randint(0, len(letters)-1)];

def get_hex_block(file, size, ratio):
    ### Open file and get dimensions and ratio
    image           = Image.open(file);
    data            = image.getdata();
    (width, height) = image.size;
    lastchannel     = image.getbands()[-1]; ### Get last channel

    ### Get the number of horizontal and vertical letters
    xpart    = round(size) or 100;
    ratio    = ratio       or 0.65;         ### Font size ratio
    partsize = width / xpart;
    ypart    = round((height / partsize) * ratio);


    ### Print info
    print("\nFile   :",file);
    print("Width  :",width);
    print("Height :",height);
    print("Parts  :",xpart,"/",ypart);
    print("Channel:",image.getbands());
    print("Ratio  :",ratio);


    ### Get horizontal and vertical points
    (xpos, ypos) = (0, 0);
    xpoint = [];
    ypoint = [];
    
    while xpos < width:
        xpos += int(width/xpart);
        xpoint.append(xpos);

    while ypos + height/ypart < height:
        ypos += int(height/ypart);
        ypoint.append(ypos);

    if width  % xpart != 0: xpoint[-1] = width;
    if height % ypart != 0: ypoint[-1] = height;

    ### Get areas
    (xpos, ypos) = (0, 0);
    areas = [];
    while( ypos < len(ypoint) - 1 ):
        (y1, y2) = (ypoint[ypos], ypoint[ypos + 1]);
        areas.append([]);
    
        xpos = 0;
        while( xpos < len(xpoint) - 1 ):
            (x1, x2) = (xpoint[xpos], xpoint[xpos + 1]);
            areas[ypos].append([]);
        
            for y in range(y1, y2):
                for x in range(x1, x2):
                    areas[ypos][xpos].append(data[(x + y * width) - 1]);
        
            xpos += 1;
        ypos += 1;

    ### Get average rgb
    hexblock = [];
    for y in range(0, ypos):
        hexblock.append([]);
    
        for x in range(0, xpos):
            if lastchannel == "A": (r, g, b, a) = (0, 0, 0, 0);
            else:                  (r, g, b)    = (0, 0, 0);
            
            counter = 0;
            for pixel in areas[y][x]:
                if lastchannel == "A": (r1, g1, b1, a1) = pixel;
                else:                  (r1, g1, b1)     = pixel;
                
                (r, g, b) = (r+r1, g+g1, b+b1);
                counter += 1;

            ### Convert to hex
            result = "";
            for c in (r, g, b):
                c = hex(round(c/counter))[2:];
                if len(c) < 2: c = '0'+c;
                result += c;
    
            hexblock[y].append(result);

    return(width, height, xpoint, ypoint, hexblock);

def save_block(hexblock):
    if os.path.isdir("output") == 0: call(["mkdir", "output"])
    HEX   = open("output/hexblock.txt", "w");
    XTERM = open("output/xtermblock.txt", "w");
    SH    = open(output, "w");
    
    SH.write('#!bin/bash');
    SH.write("\n");
    SH.write('echo -e -n \'');
    
    for line in hexblock:
        for hex in line:
            xterm = hextoxterm.approximate(hex);
            
            HEX.write  ("%s " % hex);
            XTERM.write("%s " % xterm);
            SH.write (format_string(xterm));
        
        HEX.write  ("\n");
        XTERM.write("\n");
        SH.write   ('\n');
    
    SH.write("'");
    
    HEX.close  ();
    XTERM.close();
    SH.close   ();

def print_block():
    call(["echo"]);
    call(["sh", output]);
    call(["echo"]);

def save_image(width, height, xpoint, ypoint, font, fontsize, hexblock):
    from PIL import ImageDraw;
    from PIL import ImageFont;
    
    fontwsize = 6;
    fonthsize = 10;
    
    image = Image.new( "RGB", (len(xpoint)*fontwsize, len(ypoint)*fonthsize), "black" );
    draw  = ImageDraw.Draw(image);
    font  = ImageFont.truetype(font, fontsize);
    
    counter = 0;
    xpos    = 0;
    ypos    = 0;
    for line in hexblock:
        for hex in line:
            draw.text((xpos, ypos), get_random_char(), font=font, fill="#"+hex);
            if counter == len(xpoint)-2:
                xpos    = 0;
                ypos   += fonthsize;
                counter = 0;
            else:
                xpos    += fontwsize;
                counter += 1;
                
    image.show();
    image.save("output/screenshot.png");

def img_to_xterm(file, size, ratio, font, fontsize):
    start = time.time();
    (width, height, xpoint, ypoint, hexblock) = get_hex_block(file, size, ratio);
    
    save_block(hexblock);
    
    if printend: print_block();
    if save    : save_image(width, height, xpoint, ypoint, font, fontsize, hexblock);
    print("Time   :",time.time()-start);


#-------------------------------------------------------------------------------------------------------------------#

file     = "";
ratio    = 0;
size     = 0;
printend = 0;
fill     = 0;
na       = 0;
charpool = "";
font     = "lucon.ttf";
fontsize = 9;
save     = 0;
output   = "output/image.sh";

for argument in sys.argv:
    if   argument == "-f"   : file     = sys.argv[sys.argv.index(argument) + 1];
    elif argument == "-r"   : ratio    = float(sys.argv[sys.argv.index(argument) + 1]);
    elif argument == "-s"   : size     = int(sys.argv[sys.argv.index(argument) + 1]);
    elif argument == "-p"   : printend = 1;
    elif argument == "-fill": fill     = 1;
    elif argument == "-na"  : na       = 1;
    elif argument == "-font": font     = sys.argv[sys.argv.index(argument) + 1];
    elif argument == "-fs"  : fontsize = int(sys.argv[sys.argv.index(argument) + 1]);
    elif argument == "-c"   : charpool = sys.argv[sys.argv.index(argument) + 1];
    elif argument == "-o"   : output   = sys.argv[sys.argv.index(argument) + 1];
    elif argument == "-save": save     = 1;

if file == "" or os.path.isfile(file) == 0:
    print("You didn't specify a file or file doesn't exist.");
    exit();
    
img_to_xterm(file, size, ratio, font, fontsize);
