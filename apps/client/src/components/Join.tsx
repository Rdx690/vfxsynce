"use client";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { SOCIAL_LINKS } from "@/constants";
import { fetchActiveRooms } from "@/lib/api";
import { generateName } from "@/lib/randomNames";
import { validateFullRoomId, validatePartialRoomId } from "@/lib/room";
import { useRoomStore } from "@/store/room";
import { useQuery } from "@tanstack/react-query";
import { AudioLines, PlusCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { FaDiscord, FaGithub } from "react-icons/fa";
import { toast } from "sonner";
import { ActiveRooms } from "./ActiveRooms";
// import { AnnouncementBanner } from "./AnnouncementBanner";

interface JoinFormData {
  roomId: string;
}

export const Join = () => {
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const setUsername = useRoomStore((state) => state.setUsername);
  const username = useRoomStore((state) => state.username);

  const {
    handleSubmit,
    formState: { errors },
    control,
    setValue,
  } = useForm<JoinFormData>({
    defaultValues: {
      roomId: "",
    },
  });

  useEffect(() => {
    // Set a random username when component mounts
    const generatedName = generateName();
    setUsername(generatedName);
  }, [setValue, setUsername]);

  const { data: numActiveUsers } = useQuery({
    queryKey: ["active-rooms"],
    queryFn: fetchActiveRooms,
    refetchInterval: 300, // Poll every
  });

  const router = useRouter();

  const onSubmit = (data: JoinFormData) => {
    setIsJoining(true);
    // Validate roomId
    if (!validateFullRoomId(data.roomId)) {
      toast.error("Invalid room code. Please enter 6 digits.");
      setIsJoining(false);
      return;
    }

    console.log("Joining room with data:", {
      roomId: data.roomId,
      username,
    });
    router.push(`/room/${data.roomId}`);
  };

  const handleCreateRoom = () => {
    setIsCreating(true);

    // Generate a random 6-digit room ID
    const newRoomId = Math.floor(100000 + Math.random() * 900000).toString();

    router.push(`/room/${newRoomId}`);
  };

  const handleRegenerateName = () => {
    const newName = generateName();
    setUsername(newName);
  };

  return (
    <motion.div
      className="relative min-h-dvh overflow-hidden bg-[#070914] text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[28rem] w-[38rem] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[110px]" />
        <div className="absolute -bottom-48 -left-24 h-[24rem] w-[24rem] rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
      </div>
      {/* <AnnouncementBanner /> */}
      <div className="relative z-10 w-full px-4 pb-12 pt-12 sm:pt-16 lg:px-1 max-w-[30rem] mx-auto">
        <motion.header
          className="mb-8 flex flex-col items-center text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_0_45px_rgba(139,92,246,0.18)] backdrop-blur-xl">
            <AudioLines className="size-7 text-cyan-300" strokeWidth={1.7} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold tracking-[-0.06em] text-white">VFX <span className="bg-gradient-to-r from-violet-300 via-fuchsia-200 to-cyan-300 bg-clip-text text-transparent">SYNC</span></span>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-2 py-0.5 text-[9px] font-semibold tracking-[0.18em] text-cyan-200">LIVE AUDIO</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-6 text-slate-400">Your devices. One beat. Perfectly in sync.</p>
        </motion.header>
        <motion.div
          className="mx-auto flex flex-col items-center justify-center rounded-[28px] border border-white/[0.09] bg-slate-950/70 p-6 shadow-[0_28px_100px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.03] backdrop-blur-2xl sm:p-8"
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {numActiveUsers && numActiveUsers > 0 ? (
            <motion.div
              className="flex items-center gap-1.5 mb-3"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <motion.div className="relative flex items-center justify-center">
                <motion.div className="size-2 bg-green-500 rounded-full" />
                <motion.div className="absolute size-2.5 bg-green-500/30 rounded-full animate-ping" />
              </motion.div>
              <span className="text-xs text-neutral-500 ml-0.5">
                {numActiveUsers} {numActiveUsers === 1 ? "person" : "people"} listening now
              </span>
            </motion.div>
          ) : null}
          <motion.h2
            className="mb-1 text-lg font-semibold tracking-tight text-white"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.13 }}
          >
            Join a VFX SYNC Room
          </motion.h2>

          <motion.p
            className="mb-6 max-w-xs text-center text-sm leading-6 text-slate-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            Enter a room code to join or create a new room
          </motion.p>

          <form onSubmit={handleSubmit(onSubmit)} className="w-full">
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Controller
                control={control}
                name="roomId"
                rules={{ required: "Room code is required" }}
                render={({ field }) => (
                  <InputOTP
                    autoFocus
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    data-lpignore="true"
                    data-1p-ignore
                    data-form-type="other"
                    value={field.value}
                    onChange={(value) => {
                      // Only set the value if it contains only digits
                      if (validatePartialRoomId(value)) {
                        field.onChange(value);

                        // Auto-submit when 6 digits are entered
                        if (value.length === 6) {
                          // handleSubmit(onSubmit)();
                          // Small delay to ensure UI updates before submission
                          setTimeout(() => {
                            handleSubmit(onSubmit)();
                          }, 100);
                        }
                      }
                    }}
                    className="gap-2"
                  >
                    <InputOTPGroup className="gap-2">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          className="w-9 h-10 text-base bg-neutral-800/80 border-neutral-700 transition-all duration-200 
                          focus-within:border-primary/70 focus-within:bg-neutral-800 focus-within:ring-1 focus-within:ring-primary/30"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                )}
              />
            </motion.div>
            {errors.roomId && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-xs text-red-500 text-center mt-1"
              >
                {errors.roomId.message}
              </motion.p>
            )}

            <motion.div
              className="flex items-center justify-center mt-5"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <div className="text-sm text-neutral-400">
                You&apos;ll join as{" "}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={username}
                    className="inline-block bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text font-semibold text-transparent"
                    initial={{
                      opacity: 0,
                      filter: "blur(8px)",
                    }}
                    animate={{
                      opacity: 1,
                      filter: "blur(0px)",
                    }}
                    exit={{
                      opacity: 0,
                      filter: "blur(8px)",
                    }}
                    transition={{
                      duration: 0.2,
                    }}
                  >
                    {username}
                  </motion.span>
                </AnimatePresence>
              </div>
              <Button
                type="button"
                onClick={handleRegenerateName}
                variant="ghost"
                className="text-xs text-neutral-500 hover:text-neutral-300 ml-2 h-6 px-2"
                disabled={isJoining || isCreating}
              >
                Regenerate
              </Button>
            </motion.div>

            <div className="flex flex-col gap-3 mt-5">
              <motion.button
                type="button"
                className="flex w-full cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-r from-violet-600 via-violet-500 to-indigo-500 px-5 py-3.5 text-sm font-semibold tracking-wide text-white shadow-[0_8px_30px_rgba(124,58,237,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(124,58,237,0.38)] disabled:cursor-not-allowed disabled:opacity-60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{
                  scale: 1.015,
                }}
                whileTap={{ scale: 0.985 }}
                transition={{ duration: 0.3 }}
                onClick={handleCreateRoom}
                disabled={isJoining || isCreating}
              >
                {isCreating ? (
                  <motion.div
                    transition={{
                      repeat: Infinity,
                      duration: 1,
                      ease: "linear",
                    }}
                  >
                    <PlusCircle size={16} className="mr-2" />
                  </motion.div>
                ) : (
                  <PlusCircle size={16} className="mr-2" />
                )}
                <span>{isCreating ? "Creating..." : "Create new room"}</span>
              </motion.button>

              {/* <motion.button
                  className="px-5 py-2 rounded-full font-medium text-sm tracking-wide cursor-pointer w-full hover:shadow-md hover:shadow-zinc-600/40 transition-shadow duration-500 flex items-center justify-center bg-neutral-800 text-white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{
                    scale: 1.015,
                  }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ duration: 0.3 }}
                  onClick={handleCreateRoom}
                  disabled={isJoining || isCreating}
                >
                  {isCreating ? (
                    <motion.div
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        ease: "linear",
                      }}
                    >
                      <PlusCircle size={16} className="mr-2" />
                    </motion.div>
                  ) : (
                    <PlusCircle size={16} className="mr-2" />
                  )}
                  <span>{isCreating ? "Creating..." : "Create new room"}</span>
                </motion.button> */}
            </div>
          </form>

          <motion.p
            className="mt-5 text-center text-xs leading-relaxed text-slate-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            Use native device speakers.
          </motion.p>

          {/* Divider */}
          <motion.div
            className="my-5 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          />

          {/* Social links */}
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <a
              href={SOCIAL_LINKS.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-slate-400 transition-colors hover:text-cyan-200"
            >
              <FaDiscord className="size-[17px]" />
              <span>Join Community</span>
            </a>
            <div className="h-4 w-px bg-white/10" />
            <a
              href={SOCIAL_LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-xs"
            >
              <FaGithub className="size-4" />
              <span>GitHub</span>
            </a>
          </motion.div>
        </motion.div>

        {/* Active Rooms Section */}
        <ActiveRooms />
      </div>
    </motion.div>
  );
};
