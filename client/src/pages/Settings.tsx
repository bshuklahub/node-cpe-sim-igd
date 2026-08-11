import { Header } from "@/components/Header";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Save, Shield, Globe, Clock, User, Key } from "lucide-react";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { clsx } from "clsx";

type SettingsForm = {
  acsUrl: string;
  username: string;
  password: string;
  interval: string;
  connectionRequestUsername: string;
  connectionRequestPassword: string;
  periodicInformEnabled: boolean;
};

export default function Settings() {
  const { data: settings, isLoading } = useSettings();
  const { mutate: updateSettings, isPending } = useUpdateSettings();
  const { toast } = useToast();

  const { register, handleSubmit, reset } = useForm<SettingsForm>({
    defaultValues: {
      //periodicInformEnabled: true, // Checkbox checked by default
      interval: "30", // Optional: set a default interval value
    },
  });

  useEffect(() => {
    if (settings) {
      const formValues: any = {};
      settings.forEach(s => {
        formValues[s.key] = s.value;
      });
      reset(formValues);
    }
  }, [settings, reset]);

  const onSubmit = (data: SettingsForm) => {
    const payload = Object.entries(data).map(([key, value]) => ({
      key,
      value: String(value)
    }));

    updateSettings(payload, {
      onSuccess: () => toast({ title: "Configuration Saved", description: "ACS settings updated successfully." }),
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header title="System Configuration" />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

            {/* ACS Configuration Section */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border bg-secondary/20">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-lg">ACS Connection</h2>
                </div>
                <p className="text-sm text-muted-foreground mt-1 ml-8">Configure connection to the Auto Configuration Server</p>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">ACS URL</label>
                  <input
                    {...register("acsUrl")}
                    placeholder="http://acs.example.com/cpe"
                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" /> Username
                    </label>
                    <input
                      {...register("username")}
                      className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                      <Key className="w-4 h-4 text-muted-foreground" /> Password
                    </label>
                    <input
                      type="password"
                      {...register("password")}
                      className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" /> Periodic Inform Interval (seconds)
                  </label>
                  <input
                    type="number"
                    {...register("interval")}
                    className="w-full md:w-1/3 px-4 py-2.5 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-2">Frequency of periodic status reports to ACS.</p>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="periodicInformEnabled"
                    {...register("periodicInformEnabled")}
                    className="w-4 h-4 rounded border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <label htmlFor="periodicInformEnabled" className="text-sm font-medium cursor-pointer">
                    Enable Periodic Inform
                  </label>
                </div>
              </div>
            </div>

            {/* Connection Request Auth */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border bg-secondary/20">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-green-500" />
                  <h2 className="font-semibold text-lg">Connection Request Authentication</h2>
                </div>
                <p className="text-sm text-muted-foreground mt-1 ml-8">Credentials required for ACS to initiate connection</p>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Username</label>
                  <input
                    {...register("connectionRequestUsername")}
                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Password</label>
                  <input
                    type="password"
                    {...register("connectionRequestPassword")}
                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isPending || isLoading}
                className={clsx(
                  "flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-primary-foreground shadow-lg transition-all duration-200",
                  isPending
                    ? "bg-primary/50 cursor-not-allowed"
                    : "bg-primary hover:bg-primary/90 hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0"
                )}
              >
                {isPending ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Configuration
                  </>
                )}
              </button>
            </div>

          </form>

        </div>
      </main>
    </div>
  );
}
