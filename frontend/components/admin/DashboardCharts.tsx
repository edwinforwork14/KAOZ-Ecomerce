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

const COLORS = ["#18181B", "#52525B", "#71717A", "#A1A1AA", "#D4D4D8"]

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
            innerRadius={65}
            outerRadius={85}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#18181B', 
              border: 'none', 
              borderRadius: '2px', 
              color: '#fff',
              fontSize: '10px',
              fontWeight: '700',
              textTransform: 'uppercase',
              padding: '8px 12px'
            }}
            itemStyle={{ color: '#fff' }}
          />
        </PieChart>
      </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-600 truncate">{item.name}</span>
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
            tick={{ fontSize: 9, fontWeight: 700, fill: '#71717A' }}
            width={80}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(0,0,0,0.02)' }}
            contentStyle={{ 
              backgroundColor: '#18181B', 
              border: 'none', 
              borderRadius: '2px', 
              color: '#fff',
              fontSize: '10px',
              fontWeight: '700',
              padding: '8px 12px'
            }}
          />
          <Bar dataKey="total" fill="#18181B" radius={[0, 0, 0, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MiniTrendChart({ data, color = "#71717A" }: { data: number[], color?: string }) {
  const chartData = data.map((val, i) => ({ value: val }))
  return (
    <div className="h-8 w-16">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            fill="rgba(113,113,122,0.08)" 
            strokeWidth={1.5}
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
              <stop offset="5%" stopColor="#71717A" stopOpacity={0.12}/>
              <stop offset="95%" stopColor="#71717A" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(0,0,0,0.04)" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 9, fontWeight: 700, fill: '#71717A' }}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 9, fontWeight: 700, fill: '#71717A' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#18181B', 
              border: 'none', 
              borderRadius: '2px', 
              color: '#fff',
              fontSize: '10px',
              fontWeight: '700',
              padding: '8px 12px'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="#18181B" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
