#!/bin/bash

docker-compose down --remove-orphans

docker rmi aias-executor:latest -f 2>nul

docker-compose up -d