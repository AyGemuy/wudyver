#!/bin/bash

PAGES_DIR="./pages/api"
OUTPUT_FILE="./pages/api/routes.js"

echo "Generating routes file..."

echo "export default function handler(req, res) {" > $OUTPUT_FILE
echo "  const routes = [" >> $OUTPUT_FILE

find "$PAGES_DIR" -type f \( -name "*.js" -or -name "*.jsx" -or -name "*.ts" -or -name "*.tsx" \) | while read -r file; do
  route="${file#"$PAGES_DIR"}"
  route="${route%.*}"
  route="${route//\/index/\/}"
  [[ "$route" =~ /[^/]+/ ]] && echo "    { path: \"/api$route\", name: \"$(basename "$route" | sed 's/^\(.\)/\U\1/')\", params: [{ name: 'q', required: false }] }," >> $OUTPUT_FILE
done

echo "  ];" >> $OUTPUT_FILE
echo "  res.status(200).json(routes);" >> $OUTPUT_FILE
echo "}" >> $OUTPUT_FILE

echo "✨ Routes handler saved to $OUTPUT_FILE"
