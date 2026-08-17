"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Send, Settings2, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-data";
import { updateUserProfile } from "@/services/users";
import {
  getDiscordWebhookUrl,
  saveDiscordWebhookUrl,
  saveSettings,
} from "@/services/settings";
import { DEFAULT_CHARACTER_CLASSES, DEFAULT_SERVERS } from "@/lib/constants";
import { formatDateTime, initialsOf } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { TagListEditor } from "@/components/settings/tag-list-editor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  const { isAdmin } = useAuth();

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title="Ayarlar"
        description="Karakter bilgilerini ve klan yapılandırmasını yönet."
      />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <UserRound className="size-3.5" />
            Profilim
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="clan">
              <Settings2 className="size-3.5" />
              Klan ayarları
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="pt-4">
          <ProfileSettings />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="clan" className="space-y-4 pt-4">
            <ClanSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function ProfileSettings() {
  const { profile } = useAuth();
  const { data: settings } = useSettings();
  const [form, setForm] = useState({
    nickname: "",
    characterClass: "",
    server: "",
    discord: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      nickname: profile.nickname,
      characterClass: profile.characterClass,
      server: profile.server,
      discord: profile.discord,
    });
  }, [profile]);

  if (!profile) return null;

  // Listeler klan ayarlarından yönetilir; boşsa varsayılanlara düşülür.
  const servers = settings.servers.length ? settings.servers : DEFAULT_SERVERS;
  const characterClasses = settings.characterClasses.length
    ? settings.characterClasses
    : DEFAULT_CHARACTER_CLASSES;
  const label = profile.nickname || profile.displayName;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      await updateUserProfile(profile.uid, {
        nickname: form.nickname.trim(),
        characterClass: form.characterClass,
        server: form.server,
        discord: form.discord.trim(),
      });
      toast.success("Profil güncellendi.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? `Kaydedilemedi: ${cause.message}` : "Profil kaydedilemedi."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rise Online karakter bilgileri</CardTitle>
        <CardDescription>
          Bu bilgiler farm listelerinde ve pay dağıtımında görünür.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
            <Avatar className="size-12">
              <AvatarImage src={profile.photoURL ?? undefined} alt={label} />
              <AvatarFallback>{initialsOf(label)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{profile.displayName}</p>
              <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
              <p className="text-xs text-muted-foreground">
                Katılım: {formatDateTime(profile.joinedAt)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nickname">Karakter adı</Label>
              <Input
                id="nickname"
                value={form.nickname}
                placeholder="Oyun içi nick"
                onChange={(event) => setForm({ ...form, nickname: event.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="character-class">Sınıf</Label>
              <Input
                id="character-class"
                list="character-class-options"
                value={form.characterClass}
                placeholder="Listeden seç veya yaz"
                onChange={(event) => setForm({ ...form, characterClass: event.target.value })}
              />
              <datalist id="character-class-options">
                {characterClasses.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label htmlFor="server">Sunucu</Label>
              <Input
                id="server"
                list="server-options"
                value={form.server}
                placeholder="Listeden seç veya yaz"
                onChange={(event) => setForm({ ...form, server: event.target.value })}
              />
              <datalist id="server-options">
                {servers.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discord">Discord kullanıcı adı</Label>
              <Input
                id="discord"
                value={form.discord}
                placeholder="opsiyonel"
                onChange={(event) => setForm({ ...form, discord: event.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Kaydet
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ClanSettings() {
  const { profile, isDemo } = useAuth();
  const { data: settings } = useSettings();

  const [form, setForm] = useState({
    clanName: "",
    defaultExpensePercent: 0,
    discordEnabled: false,
    discordWebhookUrl: "",
    maps: [] as string[],
    itemCategories: [] as string[],
    servers: [] as string[],
    characterClasses: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      clanName: settings.clanName,
      defaultExpensePercent: settings.defaultExpensePercent,
      discordEnabled: settings.discordEnabled,
      maps: settings.maps,
      itemCategories: settings.itemCategories,
      servers: settings.servers,
      characterClasses: settings.characterClasses,
    }));
  }, [settings]);

  // Webhook adresi gizli dokümanda; yalnızca yönetici okuyabilir.
  useEffect(() => {
    let cancelled = false;
    void getDiscordWebhookUrl().then((url) => {
      if (!cancelled) {
        setForm((current) => ({ ...current, discordWebhookUrl: url }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    if (!profile) return;

    if (form.discordEnabled && !form.discordWebhookUrl.startsWith("https://discord.com/api/webhooks/")) {
      toast.error("Geçerli bir Discord webhook adresi gir.");
      return;
    }

    setSaving(true);
    try {
      await saveSettings(
        {
          clanName: form.clanName.trim() || "Rise Farm Manager",
          defaultExpensePercent: Math.min(100, Math.max(0, form.defaultExpensePercent)),
          discordEnabled: form.discordEnabled,
          maps: form.maps,
          itemCategories: form.itemCategories,
          servers: form.servers,
          characterClasses: form.characterClasses,
        },
        profile.uid
      );
      await saveDiscordWebhookUrl(form.discordWebhookUrl.trim(), profile.uid);
      toast.success("Klan ayarları kaydedildi.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? `Kaydedilemedi: ${cause.message}` : "Ayarlar kaydedilemedi."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleTestWebhook() {
    if (isDemo) {
      toast.info("Demo modunda Discord'a gerçek istek gönderilmez.");
      return;
    }

    const { notifyDrop } = await import("@/services/discord");

    setTesting(true);
    try {
      const ok = await notifyDrop({
        farmTitle: "Test farmı",
        mapName: "Test bölgesi",
        itemName: "Test item",
        quantity: 1,
        totalValue: 1_000_000,
        players: [profile?.nickname || profile?.displayName || "Yönetici"],
        addedBy: profile?.nickname || profile?.displayName || "Yönetici",
      });

      if (ok) {
        toast.success("Test mesajı Discord kanalına gönderildi.");
      } else {
        toast.error(
          "Gönderilemedi. Webhook adresini ve Firebase Admin ortam değişkenlerini kontrol et."
        );
      }
    } finally {
      setTesting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Genel</CardTitle>
          <CardDescription>Panel başlığı ve varsayılan hesaplama tercihleri</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clan-name">Klan adı</Label>
              <Input
                id="clan-name"
                value={form.clanName}
                onChange={(event) => setForm({ ...form, clanName: event.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-expense">Varsayılan ortak kasa kesintisi (%)</Label>
              <Input
                id="default-expense"
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={form.defaultExpensePercent}
                onChange={(event) =>
                  setForm({ ...form, defaultExpensePercent: Number(event.target.value) || 0 })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Discord bildirimleri</CardTitle>
          <CardDescription>
            Yeni drop eklendiğinde kanala otomatik mesaj gönderilir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 px-4 py-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Bildirimleri aç</p>
              <p className="text-xs text-muted-foreground">
                Kapalıyken hiçbir istek gönderilmez.
              </p>
            </div>
            <Switch
              checked={form.discordEnabled}
              onCheckedChange={(checked) => setForm({ ...form, discordEnabled: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook">Webhook adresi</Label>
            <Input
              id="webhook"
              value={form.discordWebhookUrl}
              placeholder="https://discord.com/api/webhooks/..."
              onChange={(event) => setForm({ ...form, discordWebhookUrl: event.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Adres yalnızca sunucu tarafında kullanılır, üyelere gösterilmez.
            </p>
          </div>

          <Alert>
            <ShieldCheck className="size-4" />
            <AlertTitle>Sunucu tarafı gereksinimi</AlertTitle>
            <AlertDescription>
              Bildirimlerin çalışması için <code className="font-mono text-xs">FIREBASE_PROJECT_ID</code>,{" "}
              <code className="font-mono text-xs">FIREBASE_CLIENT_EMAIL</code> ve{" "}
              <code className="font-mono text-xs">FIREBASE_PRIVATE_KEY</code> ortam değişkenleri
              tanımlı olmalı.
            </AlertDescription>
          </Alert>

          <Button
            variant="outline"
            onClick={handleTestWebhook}
            disabled={testing || !form.discordEnabled}
          >
            {testing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Test mesajı gönder
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listeler</CardTitle>
          <CardDescription>
            Formlarda önerilecek harita, kategori, sınıf ve sunucu seçenekleri. Buradan
            çıkardığın bir değer, onu kullanan eski kayıtlarda olduğu gibi kalır.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <TagListEditor
            label="Haritalar / bölgeler"
            values={form.maps}
            onChange={(maps) => setForm({ ...form, maps })}
            placeholder="Örn. Topmuş"
          />
          <TagListEditor
            label="Item kategorileri"
            values={form.itemCategories}
            onChange={(itemCategories) => setForm({ ...form, itemCategories })}
            placeholder="Örn. Aksesuar"
          />
          <TagListEditor
            label="Karakter sınıfları"
            values={form.characterClasses}
            onChange={(characterClasses) => setForm({ ...form, characterClasses })}
            placeholder="Örn. Suikastçı"
          />
          <TagListEditor
            label="Sunucular"
            values={form.servers}
            onChange={(servers) => setForm({ ...form, servers })}
            placeholder="Örn. Elysium"
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Son güncelleme: {formatDateTime(settings.updatedAt)}
        </p>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Ayarları kaydet
        </Button>
      </div>
    </>
  );
}
