import { hot, SystemTrayIcon, Menu, Action } from "@nodegui/react-nodegui";
import React, { useEffect, useState } from "react";
import { QApplication, QIcon } from "@nodegui/nodegui";
import bellIcon from "./bell.png";
import GCalendarProxy from './gCalendarProxy';
import opener from "opener";

const icon = new QIcon(bellIcon);

function App() {
  const [events, setEvents] = useState([]);

  const loadEvents = async() => {
    console.log("Loading events...");
    const gcProxy = await new GCalendarProxy();
    await gcProxy.init();
    const events = await gcProxy.listEvents();

    for (const event of events) {
      const startTime = new Date(event.start);
      const waitTime = startTime.getTime() - new Date().getTime() - (30 * 1000); // Join 30 seconds before the meeting starts.
      let waitTimeInMin = waitTime / (1000 * 60);
      if (waitTimeInMin >= -2 && event.meetingLocation) {
        console.log("Waiting for " + waitTimeInMin + " minutes before opening " + event.meetingLocation);
        setTimeout(() => {
          opener(event.meetingLocation);
        }, waitTime);
      }
    }
    setEvents(events);
  };

  useEffect(() => {
    if (events.length === 0) {
      // noinspection JSIgnoredPromiseFromCall
      loadEvents();
    }
  });

  const getActions = () => {
    const items = [];
    for (const event of events) {
      console.log("Adding", event.summary, "/", event.id, "with zoom URL", event.meetingLocation);
      const startTime = new Date(event.start);

      items.push(
        <Action
          // key={event.id}
          text={`${startTime.toLocaleTimeString()} - ${event.summary}`}
          on={{
            triggered: () => {
              console.log("Opening:", event.meetingLocation);
              opener(event.meetingLocation);
            }
          }}
        />
      );
    }

    // Add the separator and the Exit menu item
    items.push(<Action
      // key={-1}
      separator
    />);
    items.push(
      <Action
        // key={-2}
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
    <SystemTrayIcon icon={icon} tooltip="Hello World" visible>
      <Menu>
        {getActions()}
      </Menu>
    </SystemTrayIcon>
  );
}

export default hot(App);
