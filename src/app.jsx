import { hot, SystemTrayIcon, Menu, Action } from "@nodegui/react-nodegui";
import React, { useEffect, useState } from "react";
import { QApplication, QIcon } from "@nodegui/nodegui";
import bellIcon from "./bell.png";
import GCalendarProxy from './gCalendarProxy';
import opener from "opener";

const icon = new QIcon(bellIcon);

function App() {
  const [isStartup, setIsStartup] = useState(true);
  const [events, setEvents] = useState([]);
  const [eventIdToCheckedMap, setEventIdToCheckedMap] = useState(new Map());

  const loadEvents = async() => {
    console.log("Loading events...");
    const gcProxy = await new GCalendarProxy();
    await gcProxy.init();
    const events = await gcProxy.listEvents();
    const newEventIdToCheckedMap = new Map();

    for (const event of events) {
      newEventIdToCheckedMap.set(event.id, eventIdToCheckedMap.has(event.id) ? eventIdToCheckedMap.get(event.id) : !!event.meetingLocation);
      const startTime = new Date(event.start);
      const endTime = new Date(event.end); // TODO: Use this to popup a window with 5 mins left.
      const waitTime = startTime.getTime() - new Date().getTime() - (30 * 1000); // Join 30 seconds before the meeting starts.
      let waitTimeInMin = waitTime / (1000 * 60);
      if (waitTimeInMin >= -2 && event.meetingLocation) {
        (event => {
          console.log("Waiting for " + waitTimeInMin + " minutes before opening " + event.meetingLocation);
          setTimeout(() => {
            if (eventIdToCheckedMap.get(event.id)) {
              console.log("Starting", event.meetingLocation);
              opener(event.meetingLocation);
            } else {
              console.log("Not starting", formatEvent(event), "because it's unchecked.");
            }
          }, waitTime);
        })(event);
      }
    }
    setEventIdToCheckedMap(newEventIdToCheckedMap);
    setEvents(events);
  };

  useEffect(() => {
    // Make sure we only do this once.
    if (isStartup) {
      setIsStartup(false);

      // noinspection JSIgnoredPromiseFromCall
      console.log("Because events is empty!");
      loadEvents();

      // Refresh every few mins
      setInterval(() => {
        loadEvents();
      }, 2000);
    }
  });

  const getActions = () => {
    const items = [];
    for (const event of events) {
      console.log("Adding", formatEvent(event), "with conference URL", event.meetingLocation, "checked:", eventIdToCheckedMap.get(event.id));
      const startTime = new Date(event.start);

      items.push(
        <Action
          text={`${formatStartTime(startTime)} - ${event.summary}`}
          checkable={true}
          checked={eventIdToCheckedMap.get(event.id) || false}
          on={{
            triggered: (isChecked) => {
              eventIdToCheckedMap.set(event.id, isChecked);
              setEventIdToCheckedMap(eventIdToCheckedMap);
            }
          }}
          menu={ // This doesn't work, unfortunately. See https://github.com/nodegui/react-nodegui/issues/375
            <Menu>
              <Action
                text="Open video conferencing"
                on={{
                  triggered: () => {
                    console.log("Opening:", event.meetingLocation);
                    opener(event.meetingLocation);
                  }
                }}
              />
            </Menu>
          }
        />
      );
    }

    // Add the separator and the Refresh, Exit menu item
    items.push(<Action
      separator
    />);
    items.push(
      <Action
        text="Refresh" on={{
        triggered: () => {
          // noinspection JSIgnoredPromiseFromCall
          console.log("Because refresh was pushed!");
          loadEvents();
        }
      }}
      />
    );
    const nextEvent = events.find(event => eventIdToCheckedMap.get(event.id));
    if (nextEvent) {
      items.push(
        <Action
          text={"Join " + nextEvent.summary} on={{
          triggered: () => {
            // noinspection JSIgnoredPromiseFromCall
            console.log("Starting", nextEvent.meetingLocation);
            opener(nextEvent.meetingLocation);
          }
        }}
        />
      );
    }
    items.push(
      <Action
        text="Exit" on={{
        triggered: () => {
          QApplication.instance().quit();
        }
      }}
      />
    );

    return items;
  };

  return (
    <SystemTrayIcon icon={icon} tooltip="Be on time!" visible>
      <Menu>
        {getActions()}
      </Menu>
    </SystemTrayIcon>
  );
}

function formatEvent(event) {
  return event.id + "|" + event.summary;
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
