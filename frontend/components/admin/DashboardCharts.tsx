"use client"

import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts"

const COLORS = ["#D9FF00", "#111111", "#888888", "#E5E5E5", "#333333"]

export function CategoryDistributionChart({ data }: { data: any[] }) {
  return (
    <div className="w-full">
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#000', 
              border: 'none', 
              borderRadius: '0', 
              color: '#fff',
              fontSize: '10px',
              fontWeight: '900',
              textTransform: 'uppercase'
            }}
            itemStyle={{ color: '#D9FF00' }}
          />
        </PieChart>
      </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-2 h-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
            <span className="text-[9px] font-black uppercase tracking-tighter truncate">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PaymentMethodsChart({ data }: { data: any[] }) {
  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: -20, right: 20 }}>
          <XAxis type="number" hide />
          <YAxis 
            dataKey="name" 
            type="category" 
            axisLine={false} 
            tickLine={false}
            tick={{ fontSize: 10, fontWeight: 900, fill: '#000' }}
            width={80}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
            contentStyle={{ 
              backgroundColor: '#000', 
              border: 'none', 
              borderRadius: '0', 
              color: '#fff',
              fontSize: '10px',
              fontWeight: '900'
            }}
          />
          <Bar dataKey="total" fill="#D9FF00" radius={[0, 0, 0, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MiniTrendChart({ data, color = "#000" }: { data: number[], color?: string }) {
  const chartData = data.map((val, i) => ({ value: val }))
  return (
    <div className="h-8 w-16">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            fill={color === "#000" ? "rgba(0,0,0,0.05)" : "rgba(217,255,0,0.2)"} 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RevenueTrendChart({ data }: { data: any[] }) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D9FF00" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#D9FF00" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 900 }}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 900 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#000', 
              border: 'none', 
              borderRadius: '0', 
              color: '#fff',
              fontSize: '10px',
              fontWeight: '900'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="#D9FF00" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
