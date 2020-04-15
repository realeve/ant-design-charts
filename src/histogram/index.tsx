import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import { Histogram as G2plotHistogram, HistogramConfig as G2plotProps } from '@antv/g2plot';
import useChart from '../hooks/useChart';
import { ErrorBoundary } from '../base';

export interface HistogramConfig extends G2plotProps {
  chartRef?: React.MutableRefObject<G2plotHistogram | undefined>;
  chartStyle?: React.CSSProperties;
  className?: string;
}

const HistogramChart = forwardRef((props: HistogramConfig, ref) => {
  const { chartRef, chartStyle = {}, className, ...rest } = props;

  const { chart, container } = useChart<G2plotHistogram, HistogramConfig>(G2plotHistogram, rest);

  useEffect(() => {
    if (chartRef) {
      chartRef.current = chart.current;
    }
  }, [chart.current]);
  useImperativeHandle(ref, () => ({
    getChart: () => chart.current,
  }));
  return (
    <ErrorBoundary>
      <div className={className} style={chartStyle} ref={container} />
    </ErrorBoundary>
  );
});

HistogramChart.defaultProps = G2plotHistogram.getDefaultOptions();

export default HistogramChart;