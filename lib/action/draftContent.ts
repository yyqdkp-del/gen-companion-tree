export type DraftType = 'leave_letter' | 'payment_confirm' | 'call_script'

export async function generateDraftContent(
  type: DraftType,
  context: Record<string, unknown>,
): Promise<string> {
  const todo = (context.todo || {}) as Record<string, unknown>
  const title = String(todo.title || '相关事项')
  const childName = String(todo.child_name || '孩子')
  const dueDate = todo.due_date ? String(todo.due_date) : '近期'

  switch (type) {
    case 'leave_letter':
      return [
        `尊敬的老师：`,
        ``,
        `您好！我是${childName}的家长。`,
        `因${title}，需请${childName}于${dueDate}请假/缺席，敬请谅解。`,
        `如有需要补充的材料或说明，请随时联系我。`,
        ``,
        `谢谢！`,
      ].join('\n')

    case 'payment_confirm':
      return [
        `付款确认草稿`,
        ``,
        `事项：${title}`,
        `截止日期：${dueDate}`,
        `金额：${todo.amount ? `${todo.amount}${todo.currency || 'THB'}` : '请核对账单'}`,
        ``,
        `我已完成付款，请查收并确认。如有收据需求请告知。`,
      ].join('\n')

    case 'call_script': {
      const callType = String(context.type || 'general')
      if (callType === 'visa') {
        return [
          `致电移民局话术：`,
          ``,
          `您好，我想咨询${title}的办理进度/所需材料。`,
          `我的签证类型是____，护照号码尾号____。`,
          `请问还需要补充哪些文件？预计多久可以完成？`,
        ].join('\n')
      }
      if (callType === 'flight') {
        return [
          `致电航空公司话术：`,
          ``,
          `您好，关于${title}的航班，我想确认：`,
          `1. 行李是否可直挂？`,
          `2. 如需改签，手续费是多少？`,
          `3. 儿童票/座位是否需要额外确认？`,
        ].join('\n')
      }
      return [
        `致电话术：`,
        ``,
        `您好，关于${title}，我想确认具体流程和所需材料。`,
        `请问今天是否方便办理？需要携带哪些证件？`,
      ].join('\n')
    }

    default:
      return `关于「${title}」的草稿，请补充具体信息后发送。`
  }
}
