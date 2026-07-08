import { PageHeader } from '@/shared/layout/PageHeader'
import { LoopFlowGuide } from '../components/LoopFlowGuide'

export function KanbanLoopHelp() {
  return (
    <div
      className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-300"
      data-testid="kanban-loop-help-page"
    >
      <PageHeader
        title="How to run a loop"
        subtitle="The maker/judge cycle behind this board — from discovering work to merging it"
        backTo="/kanban"
      />
      <LoopFlowGuide />
    </div>
  )
}
