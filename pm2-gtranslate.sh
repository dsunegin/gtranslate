#!/bin/sh

npm run compile

pm2 delete gtranslate
pm2 start npm --name gtranslate  -- run start
pm2 save