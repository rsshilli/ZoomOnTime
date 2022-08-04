const SysTray = require('systray2').default;
const os = require('os');
const path = require('path');
const {fileURLToPath} = require('url');
const GCalendarProxy = require('./gCalendarProxy');
const {websecurityscanner_v1beta} = require("googleapis");
const opener = require("opener");

async function main() {
  const gcProxy = await new GCalendarProxy();
  await gcProxy.init();
  const events = await gcProxy.listEvents();
  const items = [];
  for (const event of events) {
    console.log("Adding", event.summary, "with zoom URL", event.zoomLocation);
    const startTime = new Date(event.start);

    items.push({
      title: `${startTime.toLocaleTimeString()} - ${event.summary}`,
      tooltip: `Click here to join the meeting`,
      checked: false,
      enabled: true,
      // click is not a standard property but a custom value
      click: () => {
        console.log("Opening:", event.zoomLocation);
        opener(event.zoomLocation);
      }
    });
  }

  const itemExit = {
    title: 'Exit',
    tooltip: 'Quit this app',
    checked: false,
    enabled: true,
    click: () => {
      systray.kill(false)
    }
  }
  items.push(SysTray.separator);
  items.push(itemExit);

  const systray = new SysTray({
    menu: {
      // you should use .png icon on macOS/Linux, and .ico format on Windows
      icon: path.join(__dirname, os.platform() === 'win32' ? 'bell.ico' : './bell.png'),
      // a template icon is a transparency mask that will appear to be dark in light mode and light in dark mode
      isTemplateIcon: os.platform() === 'darwin',
      title: 'Zoom On Time',
      tooltip: 'Opens Zoom Meetings on time',
      items,
    },
    debug: false,
    copyDir: false // copy go tray binary to an outside directory, useful for packing tool like pkg.
  })

  systray.onClick(action => {
    if (action.item.click != null) {
      action.item.click()
    }
  })

// Systray.ready is a promise which resolves when the tray is ready.
  systray.ready().then(() => {
    console.log('systray started!')
  }).catch(err => {
    console.log('systray failed to start: ' + err.message)
  });
}

main();