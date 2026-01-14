export type Message = {
  conversationId: string
  senderId: string,
  senderRole: string,
  content: string,
  createdAt: string
}

export class MessageStore {
  messages = new Map<string, Message[]>;
  private static instance: MessageStore;

  private constructor(){}

  public static getInstance(){
    if(!MessageStore.instance){
      MessageStore.instance = new MessageStore();
    }
    return MessageStore.instance;
  }

}