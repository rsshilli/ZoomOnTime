import { hot, SystemTrayIcon, Menu, Action } from "@nodegui/react-nodegui";
import React, { useEffect, useRef, useState } from "react";
import { QApplication, QIcon } from "@nodegui/nodegui";
import bellIcon from "./bell.png";
import GCalendarProxy from './gCalendarProxy';
import opener from "opener";
import CountDownWindow, { formatTimeRemaining } from "./countDownWindow";

const icon = new QIcon(bellIcon);
const timeouts = [];
const eventsLoggedSet = new Set();

// So that closing the dialog popups don't close the entire application. https://github.com/nodegui/nodegui/issues/672
const qApp = QApplication.instance();
qApp.setQuitOnLastWindowClosed(false);

function App() {
  const [isStartup, setIsStartup] = useState(true);
  const [events, setEvents] = useState([]);
  const eventIdToCheckedMapRef = useRef(new Map());
  const [showCounter, setShowCounter] = useState(false);
  const [counterEvent, setCounterEvent] = useState(null);

  async function loadEvents() {
    console.log("Loading events...");
    const gcProxy = await new GCalendarProxy();
    await gcProxy.init();
    const events = await gcProxy.listEvents();
    const eventIdToCheckedMap = eventIdToCheckedMapRef.current;

    // Uncomment for verbose logging
    // console.log("Clearing previous timeouts...");
    for (const timeout of timeouts) {
      clearTimeout(timeout);
    }

    for (const event of events) {
      eventIdToCheckedMap.set(event.id, eventIdToCheckedMap.has(event.id) ? eventIdToCheckedMap.get(event.id) : !!event.meetingLocation);
      const startTime = new Date(event.start);
      const endTime = new Date(event.end); // TODO: Use this to popup a window with 5 mins left.
      const waitTimeForJoining = startTime.getTime() - new Date().getTime() - (30 * 1000); // Join 30 seconds before the meeting starts.
      const waitTimeForPopup = endTime.getTime() - new Date().getTime() - (5 * 60 * 1000); // Show popup 5 mins before the meeting ends.
      if (waitTimeForPopup >= 0 && event.meetingLocation) {
        // Set a timer to join the meeting
        // Uncomment for verbose logging
        console.log("Waiting for " + formatTimeRemaining(waitTimeForJoining) + " hh:mm:ss before opening " + formatEvent(event));
        timeouts.push(createTimeoutToStartMeeting(waitTimeForJoining, event));

        // Show the count-down that the meeting is almost over.
        console.log("Waiting for " + formatTimeRemaining(waitTimeForPopup) + " hh:mm:ss before opening popup for " + formatEvent(event));
        timeouts.push(createTimeoutToShowPopupWindow(waitTimeForPopup, event));
      }
    }
    setEvents(events);
  }

  function createTimeoutToStartMeeting(waitTime, event) {
    return setTimeout((event) => {
      startMeeting(event);
    }, waitTime, event);
  }

  function createTimeoutToShowPopupWindow(waitTime, event) {
    return setTimeout((event) => {
      showPopup(event);
    }, waitTime, event);
  }

  function startMeeting(event) {
    const eventIdToCheckedMap = eventIdToCheckedMapRef.current;
    if (eventIdToCheckedMap.get(event.id)) {
      console.log("Starting", event.meetingLocation);
      opener(event.meetingLocation);
      setShowCounter(false);
    } else {
      console.log("Not starting", event, "because it's unchecked.", eventIdToCheckedMap);
    }
  }

  function showPopup(event) {
    const eventIdToCheckedMap = eventIdToCheckedMapRef.current;
    if (eventIdToCheckedMap.get(event.id)) {
      console.log("Warning about", event.meetingLocation);
      setShowCounter(false);
      setCounterEvent(event);
      setShowCounter(true);
    } else {
      console.log("Not warning about", formatEvent(event), "because it's unchecked.", eventIdToCheckedMap);
    }
  }

  useEffect(() => {
    // Make sure we only do this once.
    if (isStartup) {
      setIsStartup(false);

      console.log("One time loading of events...");
      // noinspection JSIgnoredPromiseFromCall
      loadEvents();

      // Refresh every few mins
      // TODO: Uncomment this when the problem of starting meetings every 2 mins is fixed.
      // setInterval(() => {
      //   console.log("Loading events periodically...");
      //   // noinspection JSIgnoredPromiseFromCall
      //   loadEvents();
      // }, 2 * 60 * 1000);
    }
  });

  const getActions = () => {
    const items = [];
    const eventIdToCheckedMap = eventIdToCheckedMapRef.current;
    for (const event of events) {
      const startTime = new Date(event.start);
      // Uncomment for verbose logging
      if (!eventsLoggedSet.has(event.id)) {
        console.log(`Adding ${formatEvent(event)} with conference URL ${event.meetingLocation}, Checked: ${eventIdToCheckedMap.get(event.id)}, Title: ${formatStartTime(startTime)} - ${event.summary}`);
        eventsLoggedSet.add(event.id);
      }

      items.push(<Action
        text={`${formatStartTime(startTime)} - ${event.summary}`}
        checkable={true}
        checked={eventIdToCheckedMap.get(event.id) || false}
        separator={false} // The first item was sometimes missing if this wasn't set. Weird.
        on={{
          triggered: (isChecked) => {
            const eventIdToCheckedMap = eventIdToCheckedMapRef.current;
            eventIdToCheckedMap.set(event.id, isChecked);
            console.log("New EventIdToCheckedMap:", eventIdToCheckedMap);
          }
        }}
        // menu={ // This doesn't work, unfortunately. See https://github.com/nodegui/react-nodegui/issues/375
        //   <Menu>
        //     <Action
        //       text="Open video conferencing"
        //       on={{
        //         triggered: () => {
        //           console.log("Opening:", event.meetingLocation);
        //           opener(event.meetingLocation);
        //         }
        //       }}
        //     />
        //   </Menu>
        // }
      />);
    }

    // Add the separator and the Refresh, Exit menu item
    items.push(<Action
      separator
    />);
    items.push(<Action
      text="Refresh" on={{
      triggered: () => {
        console.log("Because refresh was pushed!");
        // noinspection JSIgnoredPromiseFromCall
        loadEvents();
      }
    }}
    />);
    const nextEvent = events.find(event => eventIdToCheckedMap.get(event.id));
    if (nextEvent) {
      items.push(<Action
        text={"Join " + nextEvent.summary} on={{
        triggered: () => {
          startMeeting(nextEvent);
        }
      }}
      />);
      items.push(<Action
        text={"Show countdown for " + nextEvent.summary} on={{
        triggered: () => {
          showPopup(nextEvent);
        }
      }}
      />);
    }
    items.push(<Action
      text="Exit" on={{
      triggered: () => {
        QApplication.instance().quit();
      }
    }}
    />);

    // Uncomment for verbose logging
    // console.log("Returning " + items.length + " items.");
    return items;
  };

  return (<>
    <SystemTrayIcon icon={icon} tooltip="Be on time!" visible>
      <Menu>
        {getActions()}
      </Menu>
    </SystemTrayIcon>
    {showCounter ? (
      <CountDownWindow event={counterEvent} />
    ) : null}
  </>);
}

function formatEvent(event) {
  return `${event.summary} (${event.id})`;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatStartTime(startTime) {
  const currentDayOfWeek = new Date().getDay();
  const startTimeDayOfWeek = startTime.getDay();
  if (currentDayOfWeek === startTimeDayOfWeek) {
    return startTime.toLocaleTimeString();
  } else {
    return `${DAYS_OF_WEEK[startTimeDayOfWeek]} ${startTime.toLocaleTimeString()}`;
  }

}

export default hot(App);
