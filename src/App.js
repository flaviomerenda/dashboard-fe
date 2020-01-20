import React from 'react';
import './App.css';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'tui-chart/dist/tui-chart.css'
import {BarChart, PieChart, LineChart} from '@toast-ui/react-chart'

// Bar chart example
/*const data = {
  categories: ['June', 'July', 'Aug', 'Sep', 'Oct', 'Nov'],
  series: [
      {
          name: 'Budget',
          data: [5000, 3000, 5000, 7000, 6000, 4000]
      },
      {
          name: 'Income',
          data: [8000, 1000, 7000, 2000, 5000, 3000]
      }
  ]
};

const options = {
  chart: {
        width: 1160,
        height: 650,
        title: 'Monthly Revenue',
        format: '1,000'
    },
    yAxis: {
        title: 'Month'
    },
    xAxis: {
        title: 'Amount',
        min: 0,
        max: 9000,
        suffix: '$'
    },
    series: {
        showLabel: true
    }
};*/

// Pie chart example
const data_pie = {
  //categories: ['credible', 'mostly credible', 'credibility uncertain', 'mostly not credible', 'not credible', 'not verifiable'],
  categories: ['Credibility'],
  series: [
      {
          name: 'Credible',
          data: 5
      },
      {
          name: 'Mostly credible',
          data: 10
      },
      {
          name: 'Credibility uncertain',
          data: 10
      },
      {
          name: 'Mostly not credible',
          data: 5
      },
      {
          name: 'Not Credible',
          data: 10
      },
      {
          name: 'Not verifiable',
          data: 60
      }
  ]
};

const options_pie = {
  chart: {
        width: 1160,
        height: 650,
        title: 'Credibility stats of the last 7 days',
    },
    tooltip: {
      suffix: "%"
    }
};

// Line chart example
const data_line = {
  categories: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  series: [
      {
          name: 'Credible',
          data: [ 10, 12, 11, 9, 8, 10, 15 ]
      },
      {
          name: 'Mostly credible',
          data: [ 50, 80, 90, 60, 40, 50, 55 ]
      },
      {
          name: 'Credibility uncertain',
          data: [ 34, 57, 23, 35, 57, 67, 87 ]
      },
      {
          name: 'Mostly not credible',
          data: [ 89, 67, 78, 45, 34, 54, 76 ]
      },
      {
          name: 'Not Credible',
          data: [ 100, 120, 110, 90, 80, 100, 150 ]
      },
      {
          name: 'Not verifiable',
          data: [ 200, 220, 210, 190, 180, 200, 250 ]
      }
  ]
};

var options_line = {
  chart: {
      width: 1160,
      height: 540,
      title: 'Credibility stats for each label'
  },
  yAxis: {
      title: 'Tweets',
  },
  xAxis: {
      title: 'Days',
      pointOnColumn: true,
      tickInterval: 'auto'
  },
  series: {
      showDot: false,
      zoomable: true
  },
  tooltip: {
      suffix: 'tweets'
  }
};

// Line chart example 2
const data_line2 = {
  categories: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  series: [
      {
          name: 'Credible',
          data: [ 60, 92, 101, 69, 48, 60, 70 ]
      },
      {
          name: 'Not Credible',
          data: [ 189, 187, 188, 135, 114, 154, 126 ]
      },
      {
          name: 'Uncertain or Not verifiable',
          data: [ 234, 277, 233, 225, 237, 267, 337 ]
      }
  ]
};

var options_line2 = {
  chart: {
      width: 1160,
      height: 540,
      title: 'Credibility stats for aggregated labels'
  },
  yAxis: {
      title: 'Tweets',
  },
  xAxis: {
      title: 'Days',
      pointOnColumn: true,
      tickInterval: 'auto'
  },
  series: {
      showDot: false,
      zoomable: true
  },
  tooltip: {
      suffix: 'tweets'
  }
};

/*const MyComponent = () => (
  <BarChart
    data={data} 
    options={options} 
  />
);*/

function App() {

  return (
    <div className="App">
      <header className="App-header">
        <img src="coinform_logotext.png" className="App-logo" alt="logo" />
        <p>
          Welcome to the Co-Inform Dashboard
        </p>
      </header>
      <PieChart
        data={data_pie} 
        options={options_pie} 
      />
      <LineChart
        data={data_line} 
        options={options_line} 
      />
      <LineChart
        data={data_line2} 
        options={options_line2} 
      />
    </div>
  );
}

export default App;
