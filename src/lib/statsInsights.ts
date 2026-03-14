import type { Widget, ProjectSettings } from '@/types';
import { 
  getProgresoStats, 
  getScopeStats, 
  getBloqueosStats, 
  getPrediccionStats 
} from './statsUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InsightSeverity = 'success' | 'warning' | 'critical' | 'info';
export type InsightCategory = 'progress' | 'velocity' | 'blockers' | 'scope' | 'forecast' | 'balance';

export interface InsightAction {
  text: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
}

export interface MetricDisplay {
  value: string | number;
  label: string;
  comparison?: string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface Insight {
  id: string;
  severity: InsightSeverity;
  category: InsightCategory;
  title: string;
  interpretation: string;
  metrics: MetricDisplay[];
  impact: string;
  actions: InsightAction[];
  xp?: number;
  achievement?: string;
  bossLevel?: number;
}

// ─── Main Generator ───────────────────────────────────────────────────────────

export function generateInsights(
  widgets: Widget[], 
  projectSettings: ProjectSettings | undefined
): Insight[] {
  const insights: Insight[] = [];
  const allowRealTime = projectSettings?.allowRealTime ?? false;
  const weeklyPace = projectSettings?.weeklyPace ?? 20;

  const progreso = getProgresoStats(widgets, allowRealTime);
  const scope = getScopeStats(widgets);
  const blockers = getBloqueosStats(widgets);
  const forecast = getPrediccionStats(widgets, allowRealTime, weeklyPace);

  // ──────────────────────────────────────────────────────────────────────
  // 1. Velocity Insights
  // ──────────────────────────────────────────────────────────────────────
  if (allowRealTime && progreso.velocityRatio != null) {
    const ratio = progreso.velocityRatio;
    const deltaH = progreso.velocityDeltaH ?? 0;
    const weekDelay = forecast.weeksRemaining > 0 ? forecast.weeksRemaining : 0;
    
    if (ratio >= 1.5) {
      // CRITICAL: Mucho más lento
      insights.push({
        id: 'velocity-critical',
        severity: 'critical',
        category: 'velocity',
        title: 'Velocity Crisis',
        interpretation: `Desarrollo ${Math.round((ratio - 1) * 100)}% más lento de lo planeado`,
        metrics: [
          {
            value: `${ratio.toFixed(1)}×`,
            label: 'Velocity Actual',
            comparison: 'Target: 1.0×',
            trend: 'up'
          },
          {
            value: deltaH > 0 ? `+${deltaH.toFixed(0)}h` : `${deltaH.toFixed(0)}h`,
            label: 'Over Budget',
            comparison: 'Planned: 0h',
            trend: 'up'
          },
          {
            value: weekDelay > 0 ? `${weekDelay.toFixed(1)}w` : '—',
            label: 'Delay Risk',
            comparison: 'Baseline',
            trend: 'up'
          }
        ],
        impact: `Con el ritmo actual, el proyecto tardará ${weekDelay > 0 ? `~${weekDelay.toFixed(1)} semanas extra` : 'significativamente más tiempo'} en completarse.`,
        actions: [
          {
            text: 'Revisar estimaciones de las tareas más lentas (identificar patrones)',
            priority: 'high',
            estimatedImpact: 'Ajustar expectativas realistas'
          },
          {
            text: 'Considerar reducir scope en contextos no-core',
            priority: 'high',
            estimatedImpact: `Recuperar hasta ${Math.round(weekDelay * 0.3)} semanas`
          },
          {
            text: '¿Las tareas son muy grandes? Dividirlas en subtareas',
            priority: 'medium',
            estimatedImpact: 'Mejorar precisión del tracking'
          }
        ],
        xp: 100,
        bossLevel: 5
      });
    } else if (ratio <= 0.9 && ratio > 0.5) {
      // SUCCESS: Más rápido de lo planeado
      insights.push({
        id: 'velocity-fast',
        severity: 'success',
        category: 'velocity',
        title: 'Speed Runner Achievement',
        interpretation: `Completando tareas ${Math.round((1 - ratio) * 100)}% más rápido de lo estimado`,
        metrics: [
          {
            value: `${ratio.toFixed(1)}×`,
            label: 'Velocity',
            comparison: 'Target: 1.0×',
            trend: 'down'
          },
          {
            value: Math.abs(deltaH).toFixed(0) + 'h',
            label: 'Time Saved',
            comparison: 'vs Estimates',
            trend: 'down'
          }
        ],
        impact: `Podrías terminar antes de lo previsto. Tiempo extra disponible.`,
        actions: [
          {
            text: 'Considera añadir features del backlog nice-to-have',
            priority: 'medium',
            estimatedImpact: 'Aprovechar tiempo extra para mejorar el juego'
          },
          {
            text: 'Ajustar estimaciones futuras (son muy conservadoras)',
            priority: 'low',
            estimatedImpact: 'Planning más preciso'
          }
        ],
        xp: 50,
        achievement: 'Speed Runner'
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // 2. Blocker Insights
  // ──────────────────────────────────────────────────────────────────────
  const tasksAffected = blockers.blockers.reduce((s, b) => s + b.blockedCount, 0);
  if (tasksAffected >= 5) {
    const pctBlocked = progreso.totalTasks > 0 
      ? Math.round((tasksAffected / progreso.totalTasks) * 100)
      : 0;
    
    insights.push({
      id: 'blockers-critical',
      severity: 'critical',
      category: 'blockers',
      title: 'Blocker Cascade',
      interpretation: `${blockers.blockers.length} cuellos de botella paralizan ${tasksAffected} tareas`,
      metrics: [
        {
          value: blockers.blockers.length,
          label: 'Blockers',
          comparison: 'Target: 0',
          trend: 'up'
        },
        {
          value: tasksAffected,
          label: 'Tasks Stuck',
          comparison: `${pctBlocked}% of total`,
          trend: 'up'
        },
        {
          value: blockers.blockers[0]?.blockedCount ?? 0,
          label: 'Worst Blocker',
          comparison: `Max impact`,
        }
      ],
      impact: `${pctBlocked}% del trabajo pendiente no puede avanzar hasta resolver estos bloqueadores.`,
      actions: blockers.blockers.slice(0, 3).map((b, i) => ({
        text: `${i === 0 ? 'DROP EVERYTHING:' : 'Resolver'} "${b.task.title}" (bloquea ${b.blockedCount})`,
        priority: i === 0 ? 'high' : i === 1 ? 'high' : 'medium',
        estimatedImpact: `Desbloquear ${b.blockedCount} tareas ${b.widget.context ? `de ${b.widget.context}` : ''}`
      })),
      xp: 150,
      bossLevel: 4
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // 3. Scope Creep Insights
  // ──────────────────────────────────────────────────────────────────────
  if (scope.scopeCreepPct > 30) {
    const isCritical = scope.scopeCreepPct > 50;

    insights.push({
      id: 'scope-creep',
      severity: isCritical ? 'critical' : 'warning',
      category: 'scope',
      title: 'Scope Creep Detected',
      interpretation: `Project grew ${Math.round(scope.scopeCreepPct)}% since the first week`,
      metrics: [
        {
          value: `+${Math.round(scope.scopeCreepPct)}%`,
          label: 'Growth',
          comparison: 'From baseline',
          trend: 'up'
        },
        {
          value: scope.addedTasks,
          label: 'New Tasks',
          comparison: `Added after first week`,
          trend: 'up'
        },
        {
          value: scope.totalTasks,
          label: 'Total Now',
          comparison: `Was ${scope.baselineTasks}`,
        }
      ],
      impact: `Uncontrolled expansion may delay launch or compromise quality.`,
      actions: [
        {
          text: `Review the ${scope.addedTasks} added tasks and mark Must-Have vs Nice-to-Have`,
          priority: 'high',
          estimatedImpact: 'Identify what can move to post-launch'
        },
        {
          text: 'Feature freeze: stop adding tasks until 80% completion',
          priority: 'high',
          estimatedImpact: 'Protect current timeline'
        },
        {
          text: 'Create MVP milestone with original scope tasks',
          priority: 'medium',
          estimatedImpact: 'Have a shippable version sooner'
        }
      ],
      xp: 75,
      bossLevel: isCritical ? 4 : undefined
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // 4. Stalled Tasks Insights
  // ──────────────────────────────────────────────────────────────────────
  if (blockers.stalled.length > 0) {
    const longestStalled = Math.max(...blockers.stalled.map(s => s.daysStalled));
    const avgStalled = blockers.stalled.reduce((s, t) => s + t.daysStalled, 0) / blockers.stalled.length;
    
    insights.push({
      id: 'stalled-tasks',
      severity: longestStalled > 14 ? 'warning' : 'info',
      category: 'blockers',
      title: 'Stalled Work Detected',
      interpretation: `${blockers.stalled.length} tareas in-progress sin actividad`,
      metrics: [
        {
          value: blockers.stalled.length,
          label: 'Stalled Tasks',
          comparison: 'In progress',
          trend: 'stable'
        },
        {
          value: `${longestStalled}d`,
          label: 'Longest',
          comparison: `Avg: ${avgStalled.toFixed(0)}d`,
          trend: 'up'
        },
        {
          value: '3d',
          label: 'Threshold',
          comparison: 'Auto-detect limit',
        }
      ],
      impact: `Estas tareas fantasma ocultan el progreso real y desordenan el board.`,
      actions: [
        ...blockers.stalled.slice(0, 2).map((s): InsightAction => ({
          text: `Revisar "${s.task.title}" (${s.daysStalled} días) — ¿Está realmente en progreso?`,
          priority: s.daysStalled > 14 ? 'high' : 'medium',
          estimatedImpact: 'Mover a blocked/todo para claridad'
        })),
        {
          text: 'Regla nueva: Auto-flag tareas in-progress sin actividad >5 días',
          priority: 'low',
          estimatedImpact: 'Prevenir esto en el futuro'
        }
      ],
      xp: 40
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // 5. Unestimated Tasks Insights
  // ──────────────────────────────────────────────────────────────────────
  if (blockers.unestimated.length > progreso.totalTasks * 0.2) {
    const pctUnestimated = Math.round((blockers.unestimated.length / progreso.totalTasks) * 100);
    const estimatedCount = progreso.totalTasks - blockers.unestimated.length;
    
    insights.push({
      id: 'unestimated-tasks',
      severity: 'warning',
      category: 'forecast',
      title: 'Hidden Scope Risk',
      interpretation: `${pctUnestimated}% de tareas sin estimación`,
      metrics: [
        {
          value: blockers.unestimated.length,
          label: 'Unestimated',
          comparison: `${pctUnestimated}% of total`,
          trend: 'up'
        },
        {
          value: estimatedCount,
          label: 'Estimated',
          comparison: `${100 - pctUnestimated}% of total`,
        },
        {
          value: '?',
          label: 'Hidden Hours',
          comparison: 'Unknown impact',
        }
      ],
      impact: `El tiempo restante podría ser hasta 50% mayor de lo que muestran las estadísticas.`,
      actions: [
        {
          text: `Estimar AHORA las tareas prioritarias (empezar por high priority)`,
          priority: 'high',
          estimatedImpact: 'Ver el scope real del proyecto'
        },
        {
          text: 'Para tareas de polish, poner placeholder (1-2h)',
          priority: 'medium',
          estimatedImpact: 'Imagen más completa del proyecto'
        },
        {
          text: 'Regla: No mover a in-progress sin estimación',
          priority: 'low',
          estimatedImpact: 'Mejorar tracking futuro'
        }
      ],
      xp: 30
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // 6. Context Balance Insights
  // ──────────────────────────────────────────────────────────────────────
  if (scope.laggedContexts.length > 0) {
    const laggedStats = scope.contexts.filter(c => scope.laggedContexts.includes(c.context));
    const totalLaggedWidgets = laggedStats.reduce((s, c) => s + c.widgetCount, 0);
    
    insights.push({
      id: 'context-balance',
      severity: 'warning',
      category: 'balance',
      title: 'Context Imbalance',
      interpretation: `${scope.laggedContexts.length} contextos sin progreso`,
      metrics: [
        {
          value: scope.laggedContexts.length,
          label: 'Lagged Contexts',
          comparison: `${scope.laggedContexts.join(', ')}`,
          trend: 'stable'
        },
        {
          value: '0%',
          label: 'Progress',
          comparison: 'All at 0%',
        },
        {
          value: totalLaggedWidgets,
          label: 'Widgets',
          comparison: 'Waiting to start',
        }
      ],
      impact: `Riesgo de crunch al final cuando llegues a estas áreas. Podrías descubrir problemas tarde.`,
      actions: [
        {
          text: `Revisar si ${scope.laggedContexts[0]} puede iniciarse ahora`,
          priority: 'high',
          estimatedImpact: 'Identificar dependencias reales'
        },
        {
          text: 'Empezar al menos 2-3 tareas de las áreas olvidadas',
          priority: 'medium',
          estimatedImpact: 'Evitar sorpresas al final'
        },
        {
          text: 'Considerar ayuda externa en áreas especializadas',
          priority: 'low',
          estimatedImpact: 'Acelerar áreas técnicas'
        }
      ],
      xp: 60
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // 7. Positive Insights (Clean Run, Hot Streak, etc.)
  // ──────────────────────────────────────────────────────────────────────
  if (progreso.pctDone > 75 && blockers.blockers.length === 0 && blockers.stalled.length === 0) {
    insights.push({
      id: 'clean-sprint',
      severity: 'success',
      category: 'progress',
      title: 'Clean Sprint Achievement',
      interpretation: `${Math.round(progreso.pctDone)}% completo sin bloqueadores ni tareas estancadas`,
      metrics: [
        {
          value: `${Math.round(progreso.pctDone)}%`,
          label: 'Progress',
          comparison: 'Target: 100%',
          trend: 'up'
        },
        {
          value: 0,
          label: 'Blockers',
          comparison: 'Clean state',
        },
        {
          value: 0,
          label: 'Stalled',
          comparison: 'All active',
        }
      ],
      impact: `El proyecto está fluyendo sin fricción. Excelente ritmo.`,
      actions: [
        {
          text: 'Mantener este ritmo hasta el final',
          priority: 'medium',
          estimatedImpact: 'Lanzamiento sin crunch'
        }
      ],
      xp: 200,
      achievement: 'Clean Sprint'
    });
  }

  // Ordenar: critical primero, luego warning, info, success
  const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 };
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return insights;
}
