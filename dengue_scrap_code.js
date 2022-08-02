const puppeteer = require('puppeteer')
const fetch = require("node-fetch")

// instantiate and return a browser instance
async function startBrowser() {
    let browser
    try{
        browser = await puppeteer.launch({
            headless: true, //change this to true to make browser invisible
            args: ["--disable-setuid-sandbox"],
            ignoreHTTPSErrors: true,
        })
    }
    catch (err){
        console.log("Could not create a browser instance => : ", err)
    }
    return browser
}
// return preprocessed dengue data
async function preprocessedData() {
    return async () => {
        // return location with attributes (lat=latitude) and (lng=longitude)
        // https://developers.google.com/maps/documentation/geocoding/requests-geocoding
        async function getLocation( addressString) {
            // try{
            //     let src = `https://maps.googleapis.com/maps/api/geocode/json?address=${addressString}&key=AIzaSyBEwvoTTcTZUJz-DgatIhWmxSJoPQ8VBh4`
            //     const response = await fetch(src).then(r => r.json())
            //     return response.results[0].geometry.location
            // }
            // catch (err){
            //     return {lat: "cannot be searched on geocoding api", lng: "cannot be searched on geocoding api"}
            // }
            let src = `https://maps.googleapis.com/maps/api/geocode/json?address=${addressString}&key=AIzaSyBEwvoTTcTZUJz-DgatIhWmxSJoPQ8VBh4`
            const response = await fetch(src).then(r => r.json())
            return response.results[0].geometry.location
        }

        let table = document.getElementById("myTable")
        let firstRow = table.rows[0]

        // minus one because the first row is the column names
        let numberOfRows = table.rows.length-1;

        // access first row, then get number of columns
        let numberOfCols = firstRow.cells.length

        // access first row, then get the cells inside
        // each cell in the first row has the column name
        // input  [NUM, STATE, PBT MOH, EPIDEMIC LOCALITY, CUMMULATIVE CASES, EPIDEMIC START DATE, EPIDEMIC PERIOD]
        // output [NUM, STATE, PBT_MOH, EPIDEMIC_LOCALITY, CUMMULATIVE_CASES, EPIDEMIC_START_DATE, EPIDEMIC_PERIOD]
        let colsNames =
            Array.from( firstRow.cells) // read all content in first row and create an array from it
                .map( x=>x.innerText.replaceAll(' ', '_')) // extract innerText, then replace space with '_'

        // fill in the datas
        // with_geolocation    = longitude & latitude     searchable on geocoding api
        // without_geolocation = longitude & latitude NOT searchable on geocoding api
        let datas = {
            "with_geolocation": {},
            "without_geolocation": {},
        }

        // iterate each row to add new data
        // i=1 because firstRow(i=0) is column names
        for (let i=1; i<table.rows.length; i++){

            // access current row
            let currentRow = table.rows[i]

            // create a new object for each row
            // key = (colName), value=(data from currentRow)
            let newData = {}
            let canBeSearchedOnGeocodingAPI = true // assumed to be true unless proven otherwise (when cannot search on geocoding api)


            // fill in data for each column
            for (let k=0; k<numberOfCols; k++){

                // access name for current column
                let currentCol = colsNames[k]

                // some preprocessing code
                // key = (current column), value = (currentRow's data)
                // convert to int
                if (currentCol==="CUMMULATIVE_CASES" || currentCol==="EPIDEMIC_PERIOD"){
                    newData[currentCol] = parseInt(currentRow.cells[k].innerText)
                }
                // add latitude and longitude
                else if (currentCol==="EPIDEMIC_LOCALITY"){
                    newData[currentCol] = currentRow.cells[k].innerText

                    // if location can be found on geocoding api, extract and add its latitude and longitude
                    try {
                        let location = await getLocation(currentRow.cells[k].innerText)
                        newData["latitude"]  = location.lat
                        newData["longitude"] = location.lng
                    }
                    // error thrown because this location cannot be found on geocoding api
                    catch (err){
                        canBeSearchedOnGeocodingAPI = false
                    }
                }
                    // UNCOMMENT BELOW IF NEEDED TO
                    // convert to timestamp?
                    // else if (currentCol==="EPIDEMIC_START_DATE"){
                    //     let dd_mm_YYYY = currentRow.cells[k].innerText
                    //     let dd_mm_YYYY_array =  dd_mm_YYYY.split("-").map( x=>parseInt(x))
                    //     let epidemic_start_date = new Date(
                    //                                         dd_mm_YYYY_array[2], //year
                    //                                         dd_mm_YYYY_array[1], //month
                    //                                         dd_mm_YYYY_array[0], //day
                    //                                     )
                    //     let epidemic_start_date_firebase_timestamp = Timestamp.fromDate( epidemic_start_date)
                    //     newData[currentCol] = epidemic_start_date_firebase_timestamp
                    // }
                // remain as string
                else {
                    newData[currentCol] = currentRow.cells[k].innerText
                }
            }

            // get the current number as key
            let currentNum = currentRow.cells[0].innerText // "NUM"

            // insert newData by their nature
            if (canBeSearchedOnGeocodingAPI){
                datas["with_geolocation"][currentNum] = newData
            }
            else{
                datas["without_geolocation"][currentNum] = newData
            }
        }
        return datas
    }
}
// object required to scrape data
const scraperObject = {
    dengue_url: "https://idengue.mysa.gov.my/ide_v3/hotspotmain.php",
    async scrapeData() {

        // create a browser instance
        let browser = await startBrowser()

        // create a new page
        let page = await browser.newPage()

        // set view port for page
        await page.setViewport({
            width: 1920,
            height: 1080
        })

        // visit url
        await page.goto( this.dengue_url)

        // read table and scrape data
        let datas = await page.evaluate( await preprocessedData())

        await browser.close()
        return datas
    }
}
// scrap and return the scrapped data
async function getDengueDatas() {
    try{
        return await scraperObject.scrapeData()
    }
    catch (err){
        console.log("Could not scrape dengue data", err);
    }
}
// exports
module.exports = {
    getDengueDatas: getDengueDatas()
};
// main()
// getDengueDatas().then((x) => {
//     console.log(x)
// })