/*
  This is the ABSOLUTELY, POSITIVELY FINAL conversion script: convert.js
  It now correctly parses your DD/MM/YYYY format.
  Run it from your terminal with: node convert.js
*/

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const marksPathString = path.resolve(__dirname, './src/data/marks.js');
const marksPathURL = pathToFileURL(marksPathString);

async function convertData() {
  console.log("Starting CSV conversion (Fixing DD/MM/YYYY format)...");

  try {
    const { PLAY_WHE_MARKS } = await import(marksPathURL);
    console.log("Loaded Dream Book data...");

    const csvFilePath = path.resolve(__dirname, './play_whe_data.csv');
    const outputFilePath = path.resolve(__dirname, './public/play_whe_results.json');
    const csvFile = fs.readFileSync(csvFilePath, 'utf8');
    console.log("Reading 'play_whe_data.csv'...");

    const { data: parsedData } = Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    console.log(`Parsed ${parsedData.length} rows...`);
    let badRowsSkipped = 0;

    // 5. Clean and Transform Data
    const cleanedData = parsedData.map(row => {
      try {
        const markNum = row.Mark;
        if (!markNum || markNum < 1 || markNum > 36) {
          throw new Error(`Invalid Mark: ${markNum}`);
        }

        const dateParts = String(row.Date).split('/');
        if (dateParts.length !== 3) {
          throw new Error(`Invalid Date format: ${row.Date}`);
        }
        
        // --- THIS IS THE FIX ---
        // We read the format as DD/MM/YYYY
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10);
        const year = parseInt(dateParts[2], 10);
        // --- END FIX ---
        
        if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1990 || year > 2050) {
          throw new Error(`Invalid Date value: ${row.Date}`);
        }

        // Create the standard YYYY-MM-DD format
        const standardDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        return {
          Date: standardDate,
          Time: row.Time || 'Unknown',
          Mark: markNum,
          MarkName: PLAY_WHE_MARKS[markNum] || 'Unknown',
          Line: String(row.Line).includes(' Line') ? row.Line : `${row.Line} Line`,
          Suit: String(row.Suit).replace(' suit', '').replace('s', ''),
          DrawNo: row.DrawNo
        };
      } catch (e) {
        badRowsSkipped++;
        return null;
      }
    }).filter(Boolean); // Removes all the null (bad) rows

    console.log(`Kept ${cleanedData.length} clean rows. Skipped ${badRowsSkipped} bad rows.`);

    // 6. Sort by Date and DrawNo (Oldest First)
    cleanedData.sort((a, b) => {
      if (a.Date < b.Date) return -1;
      if (a.Date > b.Date) return 1;
      return a.DrawNo - b.DrawNo;
    });
    console.log("Data cleaned, validated, and sorted sequentially...");

    // 7. Write the final JSON file
    fs.writeFileSync(outputFilePath, JSON.stringify(cleanedData, null, 2));
    
    console.log("==========================================");
    console.log(" SUCCESS!");
    console.log(`Created clean public/play_whe_results.json with ${cleanedData.length} results.`);
    console.log("==========================================");

  } catch (error) {
    console.error("AN ERROR OCCURRED:", error);
  }
}

convertData();