#!/bin/sh

cd /Users/smielniczuk/Documents/works/metaboy.tech/app/ &&
npm run build &&
tinypng -k wWO3onZ5_kAK-5R7qqyUGnrPRxoc67Zx dist -r &&
rsync -av -e "ssh -p 18021" --exclude='*.map' --exclude='*.blend*' --exclude='.DS_Store' /Users/smielniczuk/Documents/works/metaboy.tech/app/dist/ root@metaboy.tech:/var/www/metaboy.tech/xr
