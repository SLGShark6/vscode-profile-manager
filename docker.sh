#!/bin/bash


##########################################
##########################################
location=$(dirname "$0")

# If the location of the script is pwd
if [ $location = "." ]; then
    # Get the absolute path
    location=$(pwd)
fi

location="$location/"
##########################################
##########################################
rebuild=false
norun=false

while getopts "rn" flag; do
    case $flag in
        r) rebuild=true;;
        n) norun=true;;
    esac
done
##########################################
##########################################


image_name="vscode-extension-dev"

if ! $(docker image inspect $image_name >/dev/null 2>&1) || $rebuild; then
    docker build --rm -t $image_name $location
fi

if ! $norun; then
    docker run -it --rm \
        -v "$location:/project" \
        -e HOST_USER_ID=$(id -u $USER) \
        -e HOST_GROUP_ID=$(id -g $USER) \
        $image_name
fi
