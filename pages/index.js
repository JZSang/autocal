import Head from "next/head";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./index.module.css";

export default function Home() {
  const [calendarInput, setCalendarInput] = useState("");
  const [result, setResult] = useState();

  const tokenClient = useRef();

  // TODO(developer): Set to client ID and API key from the Developer Console
  const CLIENT_ID =
    "859456745871-36gaf9h7mi6cbbmmtk1sctl7oa0dvr1i.apps.googleusercontent.com";
  const API_KEY = "AIzaSyCPww4PPnoiqE1TsHi5MC2Gdg78Xjwl68A";

  // Authorization scopes required by the API; multiple scopes can be
  // included, separated by spaces.
  const SCOPES = "https://www.googleapis.com/auth/calendar.events";

  const DISCOVERY_DOC =
    "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest";

  let gapiLoadOkay = () => {};
  let gapiLoadFail = () => {};
  let gisLoadOkay = () => {};
  let gisLoadFail = () => {};

  const gapiLoadPromise = new Promise((resolve, reject) => {
    gapiLoadOkay = resolve;
    gapiLoadFail = reject;
  });

  const gisLoadPromise = new Promise((resolve, reject) => {
    gisLoadOkay = resolve;
    gisLoadFail = reject;
  })

  const onSubmit = useCallback((e) => {
    const run = async (e) => {
      e.preventDefault();

      // openai
      let event;
      try {
        setResult("Translating query..");
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: calendarInput,
            currentDate: `${new Date()}`,
          }),
        });

        const data = await response.json();

        if (response.status !== 200) {
          throw (
            data.error ||
            new Error(`Request failed with status ${response.status}`)
          );
        }

        event = JSON.parse(data.result);
        
      } catch (error) {
        // Consider implementing your own error handling logic here
        console.error(error);
        alert(error.message);
      }

      // google calendar
      const insertEvents = async (events) => {
        if (events.length) {
          for (const e of events) {
            await gapi.client.calendar.events.insert({
              calendarId: "primary",
              resource: e,
            });
          }
        } else {
          await gapi.client.calendar.events.insert({
            calendarId: "primary",
            resource: events,
          });
        }
      }

      try {
        await insertEvents(event);
        setResult("Event(s) created");
        return;
      } catch (err) {
        await getToken(err);
      }

      try {
        await insertEvents(event);
      } catch (err) {
        console.log(err);
        setResult("Failed");
        return;
      }
      setResult("Event(s) created");
    };
    run(e);
  }, [calendarInput]);

  /**
   * On load, called to load the auth2 library and API client library.
   */
  useEffect(() => {

    async function run() {

      await gapiLoadPromise;
      await new Promise((resolve, reject) => {
        gapi.load('client', {callback: resolve, onerror: reject});
      });
      await gapi.client.init({}).then(() => {
        gapi.client.load(DISCOVERY_DOC);
      });
  
      await gisLoadPromise;
      
      await new Promise((resolve, reject) => {
        try {
          tokenClient.current = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            prompt: 'consent',
            callback: '',
          })
        } catch (err) {
          reject(err);
        }
      })
    }
    run();

  }, []);

  /**
   *  Sign in the user if needed.
   * @param {*} err 
   */
  async function getToken(err) {
    if (err.result.error.code == 401 || (err.result.error.code == 403) &&
          (err.result.error.status == "PERMISSION_DENIED")) {

        // The access token is missing, invalid, or expired, prompt for user consent to obtain one.
        await new Promise((resolve, reject) => {
          try {
            // Settle this promise in the response callback for requestAccessToken()
            tokenClient.current.callback = (resp) => {
              if (resp.error !== undefined) {
                reject(resp);
              }
              // GIS has automatically updated gapi.client with the newly issued access token.
              console.log('gapi.client access token: ' + JSON.stringify(gapi.client.getToken()));
              resolve(resp);
            };
            tokenClient.current.requestAccessToken();
          } catch (err) {
            console.log(err)
          }
        });
      } else {
        // Errors unrelated to authorization: server errors, exceeding quota, bad requests, and so on.
        throw new Error(err);
      }
  }

  return (
    <div>
      <Head>
        <title>OpenAI Quickstart</title>
        <link rel="icon" href="/dog.png" />
      </Head>
      <main className={styles.main}>
        <form onSubmit={onSubmit}>
          <input
            type="text"
            name="Entry"
            placeholder="Natural language calendar"
            value={calendarInput}
            onChange={(e) => setCalendarInput(e.target.value)}
          />
          <input type="submit" value="Generate event" />
        </form>
        <p>{result}</p>
      </main>
      <Script
        src="https://apis.google.com/js/api.js"
        onLoad={() => gapiLoadOkay()}
        onError={() => gapiLoadFail()}
      />
      <Script
        src="https://accounts.google.com/gsi/client"
        onLoad={() => gisLoadOkay()}
        onError={() => gisLoadFail()}
      />
    </div>
  );
}
