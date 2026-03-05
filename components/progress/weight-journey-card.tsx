import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ChevronRight, Plus } from 'lucide-react-native';
import React from 'react';
import { PanResponder, Pressable, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

const WEIGHT_SERIES = [90, 89.2, 88.7, 88.1, 87.4, 86.6, 85.8, 85];

function WeightJourneyChart({ onDragStateChange }: { onDragStateChange?: (dragging: boolean) => void }) {
  const chartHeight = 176;
  const plotTop = 20;
  const plotBottom = 138;
  const grid1 = 30;
  const grid2 = 72;
  const grid3 = 114;
  const min = Math.min(...WEIGHT_SERIES);
  const max = Math.max(...WEIGHT_SERIES);
  const range = Math.max(max - min, 1);
  const [chartPixelWidth, setChartPixelWidth] = React.useState(300);
  const width = Math.max(chartPixelWidth, 1);
  const step = width / (WEIGHT_SERIES.length - 1);

  const points = WEIGHT_SERIES.map((v, i) => {
    const x = i * step;
    const t = (v - min) / range;
    const y = plotTop + t * (plotBottom - plotTop);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const fillPath = `${linePath} L${width},${chartHeight} L0,${chartHeight} Z`;
  const last = points[points.length - 1]!;
  const mid = points[Math.floor(points.length / 2)]!;
  const [cursorX, setCursorX] = React.useState(last.x);

  const clampX = (x: number) => Math.max(0, Math.min(width, x));

  const getContinuousSelection = (x: number) => {
    const xClamped = clampX(x);
    const leftIndex = Math.floor(xClamped / step);
    const rightIndex = Math.min(points.length - 1, leftIndex + 1);
    const leftPoint = points[Math.max(0, leftIndex)]!;
    const rightPoint = points[rightIndex]!;
    const span = Math.max(rightPoint.x - leftPoint.x, 1);
    const t = Math.max(0, Math.min(1, (xClamped - leftPoint.x) / span));
    const y = leftPoint.y + (rightPoint.y - leftPoint.y) * t;
    const leftWeight = WEIGHT_SERIES[Math.max(0, leftIndex)]!;
    const rightWeight = WEIGHT_SERIES[rightIndex]!;
    const weight = leftWeight + (rightWeight - leftWeight) * t;
    const nearest = Math.round(xClamped / step);

    return {
      x: xClamped,
      y,
      weight,
      nearestIndex: Math.max(0, Math.min(WEIGHT_SERIES.length - 1, nearest)),
    };
  };

  const selection = getContinuousSelection(cursorX);

  const updateFromLocationX = (locationX: number) => {
    if (chartPixelWidth <= 0) return;
    const svgX = (locationX / chartPixelWidth) * width;
    const next = getContinuousSelection(svgX);
    setCursorX(next.x);
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
    [chartPixelWidth, width, onDragStateChange]
  );

  return (
    <View className="mb-6">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-slate-700">
          Selected: {selection.weight.toFixed(1)}kg
        </Text>
        <Text className="text-xs font-medium text-slate-400">Drag across the chart</Text>
      </View>
      <View
        className="relative h-44 w-full overflow-hidden"
        onLayout={(e) => setChartPixelWidth(e.nativeEvent.layout.width)}>
        <View className="absolute inset-0 z-10" {...panResponder.panHandlers} />
        <Svg width={width} height={chartHeight}>
          <Line x1="0" y1={grid1} x2={width} y2={grid1} stroke="#f1f5f9" strokeWidth="1" />
          <Line x1="0" y1={grid2} x2={width} y2={grid2} stroke="#f1f5f9" strokeWidth="1" />
          <Line x1="0" y1={grid3} x2={width} y2={grid3} stroke="#f1f5f9" strokeWidth="1" />
          <Defs>
            <LinearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#21c45d" stopOpacity="0.2" />
              <Stop offset="100%" stopColor="#21c45d" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Path d={fillPath} fill="url(#weightFill)" />
          <Path
            d={linePath}
            fill="none"
            stroke="#21c45d"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx={points[0]!.x} cy={points[0]!.y} r={3} fill="#21c45d" />
          <Circle cx={mid.x} cy={mid.y} r={3} fill="#21c45d" />
          <Circle cx={last.x} cy={last.y} r={4} fill="white" stroke="#21c45d" strokeWidth={2} />
          <Line
            x1={selection.x}
            y1={10}
            x2={selection.x}
            y2={plotBottom + 4}
            stroke="#21c45d"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            opacity={0.4}
          />
          <Circle
            cx={selection.x}
            cy={selection.y}
            r={5}
            fill="white"
            stroke="#21c45d"
            strokeWidth={3}
          />
        </Svg>
      </View>
      <View className="mt-2 flex-row justify-between">
        <Text className="text-[10px] font-medium text-slate-400">Jan 1</Text>
        <Text className="text-[10px] font-medium text-slate-400">Feb 1</Text>
        <Text className="text-[10px] font-medium text-slate-400">Mar 1</Text>
      </View>
    </View>
  );
}

export function WeightJourneyCard({
  onOpenLogWeight,
  onChartDragStateChange,
}: {
  onOpenLogWeight: () => void;
  onChartDragStateChange?: (dragging: boolean) => void;
}) {
  return (
    <View className="mb-6 rounded-[22px] border border-slate-100 bg-white p-5 shadow-sm">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-base font-bold text-slate-900">Weight Journey</Text>
        <Button variant="ghost" size="sm" className="h-8 rounded-full px-2">
          <Text className="text-primary text-xs font-medium">History</Text>
          <Icon as={ChevronRight} className="text-primary size-4" />
        </Button>
      </View>

      <View className="mb-6 flex-row flex-wrap gap-2">
        <View className="min-w-[90px] flex-1 items-center rounded-xl bg-slate-50 px-2 py-2">
          <Text className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Start
          </Text>
          <Text className="text-lg font-bold text-slate-700">90kg</Text>
        </View>
        <View className="bg-primary/5 ring-primary/20 min-w-[90px] flex-1 items-center rounded-xl px-2 py-2 ring-1">
          <Text className="text-primary text-[10px] font-semibold tracking-wider uppercase">
            Current
          </Text>
          <Text className="text-primary-dark text-lg font-bold">85kg</Text>
        </View>
        <View className="min-w-[90px] flex-1 items-center rounded-xl bg-slate-50 px-2 py-2">
          <Text className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Lost
          </Text>
          <Text className="text-lg font-bold text-slate-700">5kg</Text>
        </View>
      </View>

      <WeightJourneyChart onDragStateChange={onChartDragStateChange} />

      <Button
        variant="outline"
        className="h-12 w-full rounded-full border-2"
        onPress={onOpenLogWeight}>
        <Icon as={Plus} className="text-foreground size-4" />
        <Text className="text-foreground text-sm font-bold">Log Today&apos;s Weight</Text>
      </Button>
    </View>
  );
}
