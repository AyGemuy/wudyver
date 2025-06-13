#!/bin/bash

find . -name "*.js" -print0 | while IFS= read -r -d $'\0' file; do
  if grep -q "../../../" "$file"; then
    echo "Ditemukan string ../../../ di file: $file"
    read -p "Apakah Anda ingin mengganti semua kemunculan dengan @? (y/n): " answer
    if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
      sed -i 's/\.\.\/\.\.\/\.\.\//g' "$file"
      echo "Semua kemunculan ../../../ telah diganti dengan @ di file: $file"
    else
      echo "Tidak ada perubahan yang dibuat pada file: $file"
    fi
  fi
done

echo "Pencarian dan penggantian selesai."
