#!/bin/sh

pm2 delete gtranslate
pm2 start npm --name gtranslate  -- run start
pm2 save