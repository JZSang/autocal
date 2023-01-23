window.onload = function () {
  const sessionText = localStorage.getItem("currentStateText");
  document.getElementById("currentStateText").innerHTML = sessionText;
  function updateLocalStorageInnerHtml(id, text, save = true) {
    if (save) {
      localStorage.setItem(id, text);
    }
    document.getElementById(id).innerHTML = text;
  }
  function onSubmit () {
    chrome.identity.getAuthToken({ interactive: true }, function (token) {
      updateLocalStorageInnerHtml("currentStateText", "Generating...", false);
      fetch(
        "https://7w2ceqy5d42omqxgmo4clujqaq0xsdwv.lambda-url.us-east-1.on.aws/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: document.getElementById("inputText").value,
            currentDate: `${new Date()}`,
          }),
        }
      )
        .then((response) => response.json())
        .then((data) => {
          updateLocalStorageInnerHtml("currentStateText", "Inserting into calendar...", false);
          console.log(data);
          const event = JSON.parse(data.result);

          const init = {
            method: "POST",
            async: true,
            headers: {
              Authorization: "Bearer " + token,
              "Content-Type": "application/json",
            },
            contentType: "json",
            body: "",
          };
          function showSimpleDate(event) {
            // show the summary, month, day, year, and time up to a minute
            const date = new Date(event.start.dateTime);
            let hours = date.getHours();
            function convertHoursTo12Hour(hours) {
              if (hours > 12) {
                return hours - 12;
              } else if (hours === 0) {
                return 12;
              } else {
                return hours;
              }
            }
            function getPMorAM(hours) {
              if (hours >= 12) {
                return "PM";
              } else {
                return "AM";
              }
            }
            const amOrPm = getPMorAM(hours);
            hours = convertHoursTo12Hour(hours);

            return (
              event.summary +
              ", " +
              hours +
              ":" +
              String(date.getMinutes()).padStart(2, "0") +
              " " +
              amOrPm +
              " " +
              (date.getMonth() + 1) +
              "/" +
              date.getDate()
            );
          }
          if (event.length) {
            for (const e of event) {
              init.body = JSON.stringify(e);
              fetch(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                init
              ).then(() => {
                updateLocalStorageInnerHtml("currentStateText", showSimpleDate(e));
              });
            }
          } else {
            init.body = JSON.stringify(event);
            fetch(
              "https://www.googleapis.com/calendar/v3/calendars/primary/events",
              init
            ).then(() => {
              updateLocalStorageInnerHtml("currentStateText", showSimpleDate(event));
            });
            
          }
        })
        .catch((error) => {
          console.log(error);
        });
    });
  }
  document.getElementById("generate").addEventListener("click", onSubmit);
  document.getElementById("inputText").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.metaKey) {
      onSubmit();
    } else if (e.key === "Enter" && e.ctrlKey) {
      onSubmit();
    }
  });
};