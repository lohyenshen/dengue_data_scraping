// Import the functions you need from the SDKs you need
// https://www.npmjs.com/package/firebase
const { initializeApp }         = require('firebase/app');
const { getDatabase, ref, set, remove } = require('firebase/database')
const { getDengueDatas }        = require('./dengue_scrap_code.js')
const cron                      = require('node-cron')

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCMIzb_dd7K78br-klzrPwvVSUEWkNDfcQ",
    authDomain: "iconsent-18fa0.firebaseapp.com",
    databaseURL: "https://iconsent-18fa0.firebaseio.com",
    projectId: "iconsent-18fa0",
    storageBucket: "iconsent-18fa0.appspot.com",
    messagingSenderId: "1070697938517",
    appId: "1:1070697938517:web:a11719b3599718fefe9edc"
};
// Initialize Firebase & Database
const app = initializeApp(firebaseConfig)
const db = getDatabase(app)


/** my codes */
// generate today's date and time in specified string format
// to save it as key in firebase
function getNowDateTimeString() {
    // https://stackoverflow.com/questions/3552461/how-do-i-format-a-date-in-javascript
    // dd-mm-YYYY,  h: m: s
    // 31-07-2022, 01:24:57
    let options = {
        second: '2-digit',
        minute: '2-digit',
        hour: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }
    let today = new Date()
    return today.toLocaleDateString( "en-GB", options).replaceAll("/", "-")
}
// perform checking & write data into firebase
// https://stackoverflow.com/questions/38884522/why-is-my-asynchronous-function-returning-promise-pending-instead-of-a-val
async function writeDengueDataToFirebase(){
    // debug
    // console.log('I am here')

    // check if there's new data from dengue website
    let hasNewDataFromDengueWebsite
    let datas
    try{
        // get dengue data from (dengue_scrap_code.js)
        datas = await getDengueDatas

        // new dengue data is obtained without error
        hasNewDataFromDengueWebsite = true
    }
    catch (err){
        // error caught when getting new dengue data
        hasNewDataFromDengueWebsite = false
    }

    // write new dengue data to firebase
    if (hasNewDataFromDengueWebsite){

        // if no error thrown,
        // there is previous dengue data in firebase AND it has been deleted successfully
        try{
            await remove(ref(db, 'dengue_data/'))
        }
        // if error thrown,
        // there is no previous dengue data,
        // HOWEVER, we will still write the latest data from idengue webstie
        catch (err){}


        // write into firebase
        await set(
            ref(db, 'dengue_data/' + getNowDateTimeString()),
            datas
        )
    }
}
// main()
function scrapAndWriteDengueDataScheduled() {
    // cron scheduler
    let time = {
        every_20_second: "*/20 * * * * *",
        every_minute: "*/1 * * * *",
        every_day: "0 0 */1 * *"           // (USE THIS) At 00:00 on every day-of-month.
    }
    cron.schedule( time.every_day,  async () => {
        await writeDengueDataToFirebase()
    })
}

// main()
scrapAndWriteDengueDataScheduled()




