import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Plus } from 'lucide-react-native';
import React from 'react';
import { PanResponder, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { useUniwind } from 'uniwind';

function WeightJourneyChart({
  series,
  onDragStateChange,
}: {
  series: number[];
  onDragStateChange?: (dragging: boolean) => void;
}) {
  const { theme } = useUniwind();
  const gridColor = theme === 'dark' ? '#365141' : '#f1f5f9';
  const pointFill = theme === 'dark' ? '#1a2e22' : '#ffffff';
  const chartHeight = 176;
  const plotTop = 20;
  const plotBottom = 138;
  const grid1 = 30;
  const grid2 = 72;
  const grid3 = 114;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = Math.max(max - min, 1);
  const [chartPixelWidth, setChartPixelWidth] = React.useState(300);
  const width = Math.max(chartPixelWidth, 1);
  const step = width / Math.max(series.length - 1, 1);

  const points = series.map((value, index) => {
    const x = index * step;
    const t = (value - min) / range;
    const y = plotTop + t * (plotBottom - plotTop);
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
    .join(' ');
  const fillPath = `${linePath} L${width},${chartHeight} L0,${chartHeight} Z`;
  const last = points[points.length - 1] ?? { x: 0, y: plotBottom };
  const mid = points[Math.floor(points.length / 2)] ?? last;
  const [cursorX, setCursorX] = React.useState(last.x);

  const clampX = (x: number) => Math.max(0, Math.min(width, x));

  const getContinuousSelection = (x: number) => {
    const xClamped = clampX(x);
    const leftIndex = Math.floor(xClamped / Math.max(step, 1));
    const rightIndex = Math.min(points.length - 1, leftIndex + 1);
    const leftPoint = points[Math.max(0, leftIndex)] ?? last;
    const rightPoint = points[rightIndex] ?? last;
    const span = Math.max(rightPoint.x - leftPoint.x, 1);
    const t = Math.max(0, Math.min(1, (xClamped - leftPoint.x) / span));
    const y = leftPoint.y + (rightPoint.y - leftPoint.y) * t;
    const leftWeight = series[Math.max(0, leftIndex)] ?? series[0] ?? 0;
    const rightWeight = series[rightIndex] ?? leftWeight;
    const weight = leftWeight + (rightWeight - leftWeight) * t;

    return { x: xClamped, y, weight };
  };

  const selection = getContinuousSelection(cursorX);

  const updateFromLocationX = (locationX: number) => {
    if (chartPixelWidth <= 0) return;
    const svgX = (locationX / chartPixelWidth) * width;
    setCursorX(getContinuousSelection(svgX).x);
  };

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          onDragStateChange?.(true);
          updateFromLocationX(evt.nativeEvent.locationX);
        },
        onPanResponderMove: (evt) => updateFromLocationX(evt.nativeEvent.locationX),
        onPanResponderRelease: () => onDragStateChange?.(false),
        onPanResponderTerminate: () => onDragStateChange?.(false),
        onPanResponderTerminationRequest: () => false,
      }),
    [chartPixelWidth, onDragStateChange, width]
  );

  return (
    <View className="mb-6">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-foreground text-sm font-semibold">
          Selected: {selection.weight.toFixed(1)}kg
        </Text>
        <Text className="text-xs font-medium text-slate-400">Drag across the chart</Text>
      </View>
      <View
        className="relative h-44 w-full overflow-hidden"
        onLayout={(event) => setChartPixelWidth(event.nativeEvent.layout.width)}>
        <View className="absolute inset-0 z-10" {...panResponder.panHandlers} />
        <Svg width={width} height={chartHeight}>
          <Line x1="0" y1={grid1} x2={width} y2={grid1} stroke={gridColor} strokeWidth="1" />
          <Line x1="0" y1={grid2} x2={width} y2={grid2} stroke={gridColor} strokeWidth="1" />
          <Line x1="0" y1={grid3} x2={width} y2={grid3} stroke={gridColor} strokeWidth="1" />
          <Defs>
            <LinearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#7ea56b" stopOpacity="0.2" />
              <Stop offset="100%" stopColor="#7ea56b" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Path d={fillPath} fill="url(#weightFill)" />
          <Path
            d={linePath}
            fill="none"
            stroke="#7ea56b"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx={points[0]?.x ?? 0} cy={points[0]?.y ?? plotBottom} r={3} fill="#7ea56b" />
          <Circle cx={mid.x} cy={mid.y} r={3} fill="#7ea56b" />
          <Circle cx={last.x} cy={last.y} r={4} fill={pointFill} stroke="#7ea56b" strokeWidth={2} />
          <Line
            x1={selection.x}
            y1={10}
            x2={selection.x}
            y2={plotBottom + 4}
            stroke="#7ea56b"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            opacity={0.4}
          />
          <Circle
            cx={selection.x}
            cy={selection.y}
            r={5}
            fill={pointFill}
            stroke="#7ea56b"
            strokeWidth={3}
          />
        </Svg>
      </View>
      <View className="mt-2 flex-row justify-between">
        <Text className="text-[10px] font-medium text-slate-400">Start</Text>
        <Text className="text-[10px] font-medium text-slate-400">Latest</Text>
      </View>
    </View>
  );
}

export function WeightJourneyCard({
  series,
  startKg,
  currentKg,
  lostKg,
  onOpenLogWeight,
  onChartDragStateChange,
}: {
  series: number[];
  startKg: number | null;
  currentKg: number | null;
  lostKg: number;
  onOpenLogWeight: () => void;
  onChartDragStateChange?: (dragging: boolean) => void;
}) {
  const chartSeries = series.length ? series : [0];

  return (
    <View className="bg-card mb-6 rounded-md p-5">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-foreground text-base font-bold">Weight Journey</Text>
      </View>

      <View className="mb-6 flex-row flex-wrap gap-2">
        <View className="bg-background-subtle min-w-[90px] flex-1 items-center rounded-md px-2 py-2">
          <Text className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Start
          </Text>
          <Text className="text-foreground text-lg font-bold">
            {startKg != null ? `${startKg}kg` : '--'}
          </Text>
        </View>
        <View className="bg-primary/10 min-w-[90px] flex-1 items-center rounded-md px-2 py-2">
          <Text className="text-primary text-[10px] font-semibold tracking-wider uppercase">
            Current
          </Text>
          <Text className="text-primary-dark text-lg font-bold">
            {currentKg != null ? `${currentKg}kg` : '--'}
          </Text>
        </View>
        <View className="bg-background-subtle min-w-[90px] flex-1 items-center rounded-md px-2 py-2">
          <Text className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Lost
          </Text>
          <Text className="text-foreground text-lg font-bold">{lostKg.toFixed(1)}kg</Text>
        </View>
      </View>

      <WeightJourneyChart series={chartSeries} onDragStateChange={onChartDragStateChange} />

      <Button variant="outline" className="h-12 w-full rounded-md" onPress={onOpenLogWeight}>
        <Icon as={Plus} className="text-foreground size-4" />
        <Text className="text-foreground text-sm font-bold">Log Today&apos;s Weight</Text>
      </Button>
    </View>
  );
}
