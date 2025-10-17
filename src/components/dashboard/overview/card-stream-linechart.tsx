"use client";

import * as React from 'react';
import Box from '@mui/material/Box';
import { Line } from 'react-chartjs-2';
import { Stack } from '@mui/system';
import { type Chart } from 'chart.js';
import i18n from '@/components/core/i18n';


class DrawStreamLine extends React.Component {
  chartItemCount = 60;
  lineRef: React.RefObject<Chart<'line'> | null> = React.createRef();
  updateData(data: number): void {
    const chart = this.lineRef.current;
    if (chart === null || chart === undefined) {
      return;
    }


    chart.data.datasets[0].data.push(data);
    if (chart.data.datasets[0].data.length >= this.chartItemCount) {
      chart.data.datasets[0].data.shift();
    }
    chart.update();
  }

  render(): React.ReactNode {
    const chartItemCount = this.chartItemCount;
    return <Line ref={this.lineRef}
      data={{
        labels: Array.from({ length: this.chartItemCount }, (_, i) => this.chartItemCount - i),
        datasets: [
          {
            data: Array(this.chartItemCount).fill(0),
            fill: false,
            borderColor: 'rgba(255,255,255,1)',
            pointRadius: 0,
            pointHitRadius: 0,
            pointHoverRadius: 0,
            tension: 0.2,
          },
        ],
      }}
      options={{
        animation: {
          duration: 50,
        },

        scales: {
          x: {
            reverse: false,
            display: false,
            ticks: {
              font: {
                size: 7,
              },
            },
          },
          y: {
            display: true,
            beginAtZero: true,
            ticks: {
              font: {
                size: 8,
              },
              stepSize: 1,
              count: 3,
            },
            grid: {
              drawTicks: false,
            },
          },
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            displayColors: false,
            callbacks: {
              label(context) {
                const x = 0 - chartItemCount + (context.parsed.x ?? 0);
                return `${i18n.t('Time')}: ${x}s, ${i18n.t('QPS')}: ${context.parsed.y}`;
              },
              title() {
                return '';
              }
            },
          },
        },
        maintainAspectRatio: false,
      }}
    />
  };
};

interface StreamLineChartProps {
  data: number;
  dataIndex: number;
}

export function StreamLineChart({ data, dataIndex }: StreamLineChartProps): React.JSX.Element {
  const lineRef = React.useRef<DrawStreamLine | null>(null);

  React.useEffect(() => {
    const chart = lineRef.current;
    if (chart === null) {
      return;
    }

    if (data === null || data === undefined) {
      return;
    }

    chart.updateData(data);
  }, [data, dataIndex]
  );

  const memoizedDrawLine = React.useMemo(() => {
    return <DrawStreamLine ref={lineRef} />;
  }, []);

  return (<Box
    sx={{
      height: '100%',
      width: '100%',
    }}>
    <Stack spacing={2}>
      <Box sx={{
        fontSize: "1.8rem",
        fontWeight: "bold",
        color: "var(--mui-palette-dashboard-color)",
        marginTop: "0px",
        marginBottom: "0px",
      }}>
        {data}
      </Box>
    </Stack>
    <Stack spacing={2}>
      <Box sx={{
        height: "50px",
        width: "100%",
        color: "var(--mui-palette-dashboard-color)",
      }}>
        {memoizedDrawLine}
      </Box>
    </Stack>
  </Box>);
}
