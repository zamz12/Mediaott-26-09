import { requireSessionUser } from "@/lib/session";
import { getMyChannels } from "@/modules/media/service";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createChannelAction, updateChannelAction } from "./actions";

export const metadata = { title: "Channel" };

export default async function ChannelSettingsPage() {
  const user = await requireSessionUser();
  const [channel] = await getMyChannels(user.id);

  if (!channel) {
    return (
      <div className="max-w-lg">
        <h1 className="mb-4 text-xl font-bold">Create your channel</h1>
        <form action={createChannelAction} className="space-y-4">
          <div>
            <Label htmlFor="name">Channel name</Label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>
          <Button type="submit">Create channel</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-xl font-bold">Channel settings</h1>
      <form action={updateChannelAction} className="space-y-4">
        <div>
          <Label htmlFor="name">Channel name</Label>
          <Input id="name" name="name" defaultValue={channel.name} required />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" rows={3} defaultValue={channel.description ?? ""} />
        </div>
        <div>
          <Label htmlFor="avatarUrl">Avatar URL</Label>
          <Input id="avatarUrl" name="avatarUrl" defaultValue={channel.avatarUrl ?? ""} placeholder="https://…" />
        </div>
        <div>
          <Label htmlFor="bannerUrl">Banner URL</Label>
          <Input id="bannerUrl" name="bannerUrl" defaultValue={channel.bannerUrl ?? ""} placeholder="https://…" />
        </div>
        <Button type="submit">Save changes</Button>
      </form>
    </div>
  );
}
