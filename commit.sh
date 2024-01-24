#!/bin/bash
COMMIT_MESSAGE="$1"

if [[ -z "${COMMIT_MESSAGE}" ]]; then
    COMMIT_MESSAGE="Updates - Automated Commit Message"
fi

git add -A && git commit -m "${COMMIT_MESSAGE}" && git push -u origin master
