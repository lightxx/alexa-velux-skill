#!/usr/bin/env bash

function show_help() {
  echo "Usage: $(basename $0) [command]"
  echo "Commands:"
  echo "  discovery      Run discovery payload"
  echo "  reportstate    Run reportstate payload"
  echo "  --help, -?     Show this help message"
}

if [ $# -eq 0 ]; then
  show_help
  exit 1
fi

case "$1" in
  discovery)
    aws lambda invoke --function-name alexa-velux-skill --payload file://payload-discovery.json --cli-binary-format raw-in-base64-out discovery-response.json
    ;;
  reportstate)
    aws lambda invoke --function-name alexa-velux-skill --payload file://payload-reportstate.json --cli-binary-format raw-in-base64-out state-response.json
    ;;
  --help | -?)
    show_help
    ;;
  *)
    echo "Error: Unknown command '$1'"
    show_help
    exit 1
    ;;
esac
