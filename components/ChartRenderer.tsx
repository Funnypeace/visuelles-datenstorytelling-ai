
import React from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell, Sector,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Label
} from 'recharts';
import type { ChartSuggestion, ParsedData, DataEntry } from '../types';
import { CHART_COLORS } from '../constants';

interface ChartRendererProps {
  suggestion: ChartSuggestion;
  data: ParsedData;
}

const CustomizedAxisTick: React.FC<any> = (props) => {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="end" fill="#666" transform="rotate(-35)" fontSize={10}>
        {payload.value}
      </text>
    </g>
  );
};

const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="font-bold">
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${value}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
        {`(Rate: ${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};


export const ChartRenderer: React.FC<ChartRendererProps> = ({ suggestion, data }) => {
  const [activeIndex, setActiveIndex] = React.useState(0);

  const onPieEnter = React.useCallback((_: any, index: number) => {
    setActiveIndex(index);
  }, []);

  // Ensure data has numeric values for Y axes where expected
  const cleanData = React.useMemo(() => {
    return data.map(entry => {
      const newEntry: DataEntry = { ...entry };
      if (suggestion.dataKeys.y) {
        if (Array.isArray(suggestion.dataKeys.y)) {
          suggestion.dataKeys.y.forEach(key => {
            if (typeof newEntry[key] === 'string') newEntry[key] = parseFloat(newEntry[key] as string) || 0;
          });
        } else {
           if (typeof newEntry[suggestion.dataKeys.y] === 'string') newEntry[suggestion.dataKeys.y] = parseFloat(newEntry[suggestion.dataKeys.y] as string) || 0;
        }
      }
      if (suggestion.dataKeys.value && typeof newEntry[suggestion.dataKeys.value] === 'string') {
         newEntry[suggestion.dataKeys.value] = parseFloat(newEntry[suggestion.dataKeys.value] as string) || 0;
      }
      if (suggestion.dataKeys.z && typeof newEntry[suggestion.dataKeys.z] === 'string') {
        newEntry[suggestion.dataKeys.z] = parseFloat(newEntry[suggestion.dataKeys.z] as string) || 0;
     }
      return newEntry;
    });
  }, [data, suggestion.dataKeys]);


  if (!suggestion.dataKeys || Object.keys(suggestion.dataKeys).length === 0) {
    return <p className="text-red-500 text-center p-4">Ungültige Diagrammkonfiguration: Fehlende dataKeys.</p>;
  }
  
  try {
    switch (suggestion.type) {
      case 'LineChart':
        if (!suggestion.dataKeys.x || !suggestion.dataKeys.y) return <p className="text-red-500">LineChart: x oder y dataKey fehlt.</p>;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cleanData} margin={{ top: 5, right: 20, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey={suggestion.dataKeys.x} tick={<CustomizedAxisTick />} height={70} interval={0}>
                 <Label value={suggestion.dataKeys.x} offset={-50} position="insideBottom" />
              </XAxis>
              <YAxis tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString() : value}>
                 {/* <Label value={Array.isArray(suggestion.dataKeys.y) ? suggestion.dataKeys.y.join(', ') : suggestion.dataKeys.y} angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} /> */}
              </YAxis>
              <Tooltip formatter={(value: number | string) => typeof value === 'number' ? value.toLocaleString() : value} />
              <Legend verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}} />
              {Array.isArray(suggestion.dataKeys.y)
                ? suggestion.dataKeys.y.map((yKey, index) => (
                    <Line key={yKey} type="monotone" dataKey={yKey} stroke={CHART_COLORS[index % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  ))
                : <Line type="monotone" dataKey={suggestion.dataKeys.y as string} stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'BarChart':
        if (!suggestion.dataKeys.x || !suggestion.dataKeys.y) return <p className="text-red-500">BarChart: x oder y dataKey fehlt.</p>;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cleanData} margin={{ top: 5, right: 20, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
               <XAxis dataKey={suggestion.dataKeys.x} tick={<CustomizedAxisTick />} height={70} interval={0}>
                 <Label value={suggestion.dataKeys.x} offset={-50} position="insideBottom" />
              </XAxis>
              <YAxis tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString() : value}/>
              <Tooltip formatter={(value: number | string) => typeof value === 'number' ? value.toLocaleString() : value} />
              <Legend verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}}/>
              {Array.isArray(suggestion.dataKeys.y)
                ? suggestion.dataKeys.y.map((yKey, index) => (
                    <Bar key={yKey} dataKey={yKey} fill={CHART_COLORS[index % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
                  ))
                : <Bar dataKey={suggestion.dataKeys.y as string} fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'PieChart':
        if (!suggestion.dataKeys.name || !suggestion.dataKeys.value) return <p className="text-red-500">PieChart: name oder value dataKey fehlt.</p>;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={cleanData}
                cx="50%"
                cy="50%"
                innerRadius="50%"
                outerRadius="70%"
                fill="#8884d8"
                dataKey={suggestion.dataKeys.value}
                nameKey={suggestion.dataKeys.name}
                onMouseEnter={onPieEnter}
              >
                {cleanData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" wrapperStyle={{paddingTop: '20px'}}/>
              <Tooltip formatter={(value: number | string) => typeof value === 'number' ? value.toLocaleString() : value} />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case 'ScatterChart':
        if (!suggestion.dataKeys.x || !suggestion.dataKeys.y) return <p className="text-red-500">ScatterChart: x oder y dataKey fehlt.</p>;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
              <CartesianGrid stroke="#e0e0e0" />
              <XAxis type="number" dataKey={suggestion.dataKeys.x} name={suggestion.dataKeys.x} tick={<CustomizedAxisTick />} height={70} interval={0}>
                 <Label value={suggestion.dataKeys.x} offset={-50} position="insideBottom" />
              </XAxis>
              <YAxis type="number" dataKey={suggestion.dataKeys.y} name={Array.isArray(suggestion.dataKeys.y) ? suggestion.dataKeys.y.join('/') : suggestion.dataKeys.y} tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString() : value} />
              {suggestion.dataKeys.z && <YAxis yAxisId="right" type="number" dataKey={suggestion.dataKeys.z} name={suggestion.dataKeys.z} orientation="right" stroke={CHART_COLORS[2]} />}
              <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value: number | string) => typeof value === 'number' ? value.toLocaleString() : value} />
              <Legend verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}} />
              {Array.isArray(suggestion.dataKeys.y) ? (
                suggestion.dataKeys.y.map((yKey, index) => (
                  <Scatter key={yKey} name={yKey} data={cleanData} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))
              ) : (
                <Scatter name={suggestion.dataKeys.y as string} data={cleanData} fill={CHART_COLORS[0 % CHART_COLORS.length]} />
              )}
               {suggestion.dataKeys.z && <Scatter yAxisId="right" name={suggestion.dataKeys.z} data={cleanData} fill={CHART_COLORS[2 % CHART_COLORS.length]} shape="triangle" />}
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return <p className="text-orange-500 text-center p-4">Unbekannter oder nicht unterstützter Diagrammtyp: {suggestion.type}</p>;
    }
  } catch (error) {
    console.error("Chart rendering error:", error, suggestion, data);
    return <p className="text-red-600 text-center p-4">Fehler beim Rendern des Diagramms. Überprüfen Sie die Daten und Konfiguration.</p>;
  }
};
