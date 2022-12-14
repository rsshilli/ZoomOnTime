import React, { useEffect, useReducer } from "react";
import { Text, Dialog, View } from "@nodegui/react-nodegui";
import bellIcon from "./bell.png";
import { QIcon } from "@nodegui/nodegui";

const icon = new QIcon(bellIcon);

/**
 * @param waitTime The number of ms to wait
 * @returns {string} The number of minutes:seconds to wait.
 */
export function formatTimeRemaining(waitTime) {
  const isNegative = waitTime < 0;
  const remainingTimeInSeconds = Math.abs(Math.floor(waitTime / 1000));
  const remainingHours = ("" + (Math.floor(remainingTimeInSeconds / (60 * 60)))).padStart(2, "0");
  const remainingMins = ("" + (Math.floor(remainingTimeInSeconds / 60) % 60)).padStart(2, "0");
  const remainingSeconds = ("" + remainingTimeInSeconds % 60).padStart(2, "0");
  return (isNegative ? "-" : "")
    + (remainingHours === "00" ? "" : remainingHours + ":")
    + remainingMins + ":" + remainingSeconds;
}

function CountDownWindow(props) {
  const thisEventSummary = props.event.summary;
  const thisEventEndTime = new Date(props.event.end);
  const [ignored, forceUpdate] = useReducer(x => x + 1, 0);
  const remainingTime = thisEventEndTime.getTime() - Date.now();
  const remainingTimeAsString = formatTimeRemaining(remainingTime);
  const notMuchTimeLeft = remainingTime <= 5 * 60 * 1000;
  const overTime = remainingTime < 0;

  useEffect(() => {
    // Update this countdown every second.
    const timeoutId = setTimeout(() => forceUpdate(), 1000);
    return () => clearTimeout(timeoutId);
  });

  return (
    <Dialog windowTitle={`${overTime ? "YOU ARE OVER TIME!" : notMuchTimeLeft ? "Wrap it up!" : "Counting down the time left"} (${thisEventSummary})`}
            windowIcon={icon}
            on={{
              Close: () => props.on.Close && props.on.Close(),
            }}
            minSize={{
              width: 100, height: 100
            }}
    >
      <View minSize={{width: 20, height: 20}}>
        <Text style={headerStyle}>{thisEventSummary} ends at {thisEventEndTime.toLocaleTimeString()}</Text>
        <Text style={timerStyle}>{remainingTimeAsString}</Text>
        {overTime ? (
          <Text style={subTextStyle}>YOU ARE OVER TIME! END IT.</Text>
        ) : notMuchTimeLeft ? (
          <Text style={subTextStyle}>Do you need a bio-break? More water? Wrap it up.</Text>
        ) : null}
      </View>
    </Dialog>
  );
}

const headerStyle = `
  height: '20px';
  font-size: 12px;
  width: '100%';
  padding-left: 10px;
  padding-right: 10px;
`;

const timerStyle = `
  height: '100px';
  width: '100%';
  color: '#802433';
  background-color: '#9fa6b3';
  font-size: 100px;
  padding: 10px;
`;

const subTextStyle = `
  height: '20px';
  font-size: 12px;
  width: '100%';
  padding-left: 10px;
  padding-right: 10px;
`;

export default CountDownWindow;
