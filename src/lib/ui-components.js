/**
 * Barrel export of all ShadCN UI components.
 * Imported as a single `UI` object and injected into the agent's component sandbox.
 * Agent accesses components as UI.Button, UI.Card, UI.Input, etc.
 */

// Layout
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
export { Separator } from '@/components/ui/separator';
export { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
export { Skeleton } from '@/components/ui/skeleton';

// Forms
export { Button } from '@/components/ui/button';
export { Input } from '@/components/ui/input';
export { Textarea } from '@/components/ui/textarea';
export { Label } from '@/components/ui/label';
export { Checkbox } from '@/components/ui/checkbox';
export { Switch } from '@/components/ui/switch';
export { Slider } from '@/components/ui/slider';
export { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
export {
  Select, SelectGroup, SelectValue, SelectTrigger,
  SelectContent, SelectLabel, SelectItem, SelectSeparator,
} from '@/components/ui/select';

// Feedback
export { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
export { Badge } from '@/components/ui/badge';
export { Progress } from '@/components/ui/progress';

// Data Display
export {
  Table, TableHeader, TableBody, TableFooter,
  TableHead, TableRow, TableCell, TableCaption,
} from '@/components/ui/table';
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
export { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

// Overlays
export {
  Drawer, DrawerPortal, DrawerOverlay, DrawerTrigger, DrawerClose,
  DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription,
} from '@/components/ui/drawer';
export {
  Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger,
  DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
export { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
export {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';

// Tabs
export { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
