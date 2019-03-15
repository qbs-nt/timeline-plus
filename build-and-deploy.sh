#!/bin/bash

# choke on any error
set -e

# print each command (-v = before variable substitution, -x = after)
# set -v
set -x

BUILD_DIR="./dist"
DEPLOY_TARGET="/Volumes/local/obgweb2/htdocs/jscript/qbus-js/timeline-plus--forked"

if [ ! -d `dirname "${DEPLOY_TARGET}"` ]; then
  echo "BASE DIR FOR DEPLOY TARGET '${DEPLOY_TARGET}' DOES NOT EXIST"
  exit 1
fi

npm run build

rm -rf "${DEPLOY_TARGET}"

cp -R "${BUILD_DIR}" "${DEPLOY_TARGET}"

obg-notifier.sh -title "timeline-plus Fork" -message "Built & deployed" -group visfork

echo "Finished."

