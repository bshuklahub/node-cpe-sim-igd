#!/bin/bash

INPUT_FILE="devices.csv"
BASE_URL="http://10.249.170.70:80/groups/white_listed_devices"

while IFS=',' read -r SERIAL OUI MODEL _ NAME USERNAME
do
    # Skip empty lines
    [ -z "$SERIAL" ] && continue

    DEVICE_KEY="${SERIAL}|${OUI}|${MODEL}"

    echo "Processing device: $DEVICE_KEY"

    echo "curl --max-time 2  -X PUT ${BASE_URL}/${DEVICE_KEY}"

    curl -s --max-time 2  -X PUT "${BASE_URL}/${DEVICE_KEY}"

    echo "----------------------------------------"

done < "$INPUT_FILE"